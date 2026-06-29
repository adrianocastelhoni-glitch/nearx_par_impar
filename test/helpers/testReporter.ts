import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { formatEther } from "ethers";

export type TestStatus = "passed" | "failed" | "skipped";

export type BalanceSnapshot = {
  wei: string;
  eth: string;
};

export type BalancesReport = {
  p1: BalanceSnapshot;
  p2: BalanceSnapshot;
  contract: BalanceSnapshot;
};

export type TestStep = {
  step: number;
  label: string;
  action?: string;
  data?: Record<string, unknown>;
};

export type GameTestPayload = {
  scenario: string;
  description?: string;
  resolution: "resultGame" | "claimGame";
  isOdd: boolean;
  optionP1: number;
  optionP2: number;
  hashOptionP1?: string;
  keyGame?: string;
  revealedKeyGame?: string;
  fraudDetected?: boolean;
  winner: "player1" | "player2" | "draw";
  steps?: TestStep[];
  balances: {
    before: BalancesReport;
    after: BalancesReport;
    delta: { p1: BalanceSnapshot; p2: BalanceSnapshot };
  };
  lastGameRecord?: Record<string, unknown>;
};

export type TestRecord = {
  name: string;
  status: TestStatus;
  durationMs: number;
  payload: GameTestPayload;
  error?: string;
};

export type RunReport = {
  runId: string;
  timestamp: string;
  network: string;
  grep?: string;
  gitCommit?: string;
  ci: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
  };
  tests: TestRecord[];
};

type RunState = {
  runId: string;
  startedAt: number;
  network: string;
  tests: TestRecord[];
  pendingPayload?: GameTestPayload;
  pendingTestName?: string;
};

const RESULTS_DIR = path.join(process.cwd(), "test-results");

let currentRun: RunState | undefined;

function snapshotBalance(wei: bigint): BalanceSnapshot {
  return { wei: wei.toString(), eth: formatEther(wei) };
}

function inferWinner(deltaP1: bigint, deltaP2: bigint): "player1" | "player2" | "draw" {
  if (deltaP1 > deltaP2) return "player1";
  if (deltaP2 > deltaP1) return "player2";
  return "draw";
}

function readGitCommit(): string | undefined {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

function readGrepFilter(): string | undefined {
  const grepIndex = process.argv.indexOf("--grep");
  if (grepIndex === -1) return undefined;
  return process.argv[grepIndex + 1];
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

function toJson(value: unknown): string {
  return `${JSON.stringify(value, jsonReplacer, 2)}\n`;
}

function formatRunId(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function testStatus(test: Mocha.Test): TestStatus {
  if (test.pending) return "skipped";
  if (test.state === "failed") return "failed";
  return "passed";
}

export function initTestRun(options: { network?: string } = {}): void {
  currentRun = {
    runId: formatRunId(new Date()),
    startedAt: Date.now(),
    network: options.network ?? "hardhat",
    tests: [],
  };
}

export function beginTest(testName: string): void {
  if (!currentRun) {
    initTestRun();
  }
  currentRun!.pendingPayload = undefined;
  currentRun!.pendingTestName = testName;
}

export type RecordGameOutcomeParams = {
  scenario: string;
  description?: string;
  resolution: "resultGame" | "claimGame";
  isOdd: boolean;
  optionP1: number;
  optionP2: number;
  hashOptionP1?: string;
  keyGame?: string;
  revealedKeyGame?: string;
  fraudDetected?: boolean;
  balanceP1before: bigint;
  balanceP2before: bigint;
  balanceContractBefore: bigint;
  balanceP1after: bigint;
  balanceP2after: bigint;
  balanceContractAfter: bigint;
  lastGameRecord?: Record<string, unknown>;
  steps?: TestStep[];
};

export function recordGameOutcome(params: RecordGameOutcomeParams): void {
  if (!currentRun) {
    initTestRun();
  }

  const deltaP1 = params.balanceP1after - params.balanceP1before;
  const deltaP2 = params.balanceP2after - params.balanceP2before;

  currentRun!.pendingPayload = {
    scenario: params.scenario,
    description: params.description,
    resolution: params.resolution,
    isOdd: params.isOdd,
    optionP1: params.optionP1,
    optionP2: params.optionP2,
    hashOptionP1: params.hashOptionP1,
    keyGame: params.keyGame,
    revealedKeyGame: params.revealedKeyGame,
    fraudDetected: params.fraudDetected,
    winner: inferWinner(deltaP1, deltaP2),
    steps: params.steps,
    balances: {
      before: {
        p1: snapshotBalance(params.balanceP1before),
        p2: snapshotBalance(params.balanceP2before),
        contract: snapshotBalance(params.balanceContractBefore),
      },
      after: {
        p1: snapshotBalance(params.balanceP1after),
        p2: snapshotBalance(params.balanceP2after),
        contract: snapshotBalance(params.balanceContractAfter),
      },
      delta: {
        p1: snapshotBalance(deltaP1),
        p2: snapshotBalance(deltaP2),
      },
    },
    lastGameRecord: params.lastGameRecord,
  };
}

export function finalizeTest(mochaContext: Mocha.Context): void {
  if (!currentRun?.pendingPayload) return;

  const test = mochaContext.currentTest;
  if (!test) return;

  const record: TestRecord = {
    name: test.title ?? currentRun.pendingTestName ?? "unknown",
    status: testStatus(test),
    durationMs: Math.round(test.duration ?? 0),
    payload: currentRun.pendingPayload,
  };

  if (test.state === "failed" && test.err) {
    record.error = test.err.message;
  }

  currentRun.tests.push(record);
  currentRun.pendingPayload = undefined;
  currentRun.pendingTestName = undefined;
}

export function writeRunReport(): string | null {
  if (!currentRun || currentRun.tests.length === 0) {
    return null;
  }

  mkdirSync(RESULTS_DIR, { recursive: true });

  const durationMs = Date.now() - currentRun.startedAt;
  const passed = currentRun.tests.filter((t) => t.status === "passed").length;
  const failed = currentRun.tests.filter((t) => t.status === "failed").length;
  const skipped = currentRun.tests.filter((t) => t.status === "skipped").length;

  const report: RunReport = {
    runId: currentRun.runId,
    timestamp: new Date().toISOString(),
    network: currentRun.network,
    grep: readGrepFilter(),
    gitCommit: readGitCommit(),
    ci: Boolean(process.env.CI),
    summary: {
      total: currentRun.tests.length,
      passed,
      failed,
      skipped,
      durationMs,
    },
    tests: currentRun.tests,
  };

  const fileName = `run-${currentRun.runId}.json`;
  const filePath = path.join(RESULTS_DIR, fileName);
  writeFileSync(filePath, toJson(report), "utf8");

  const historyPath = path.join(RESULTS_DIR, "history.jsonl");
  for (const test of currentRun.tests) {
    const historyLine = {
      runId: report.runId,
      timestamp: report.timestamp,
      test: test.name,
      status: test.status,
      scenario: test.payload.scenario,
      winner: test.payload.winner,
      durationMs: test.durationMs,
    };
    writeFileSync(historyPath, `${JSON.stringify(historyLine, jsonReplacer)}\n`, { flag: "a" });
  }

  return filePath;
}
