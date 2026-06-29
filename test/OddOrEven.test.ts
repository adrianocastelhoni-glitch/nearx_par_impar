import { expect } from "chai";
import { network } from "hardhat";
import {
  beginTest,
  finalizeTest,
  initTestRun,
  recordGameOutcome,
  writeRunReport,
} from "./helpers/testReporter.js";

const { ethers } = await network.create("hardhat");

type GameData = {
  hashOptionP1: string; // Hash of Player 1's option
  timeOut: string;      // Timeout duration in seconds (uint64)
  timeOutP1: string;    // Player 1 timeout timestamp (uint256)
  timeOutP2: string;    // Player 2 timeout timestamp (uint256)
  nLockTime: string;    // Lock time for the game (uint256)
  isOdd: boolean;       // Whether the game is Odd/Even (bool)
  player1: string;      // Player 1's address (address)
  player2: string;      // Player 2's address (address)
  optionP2: number;     // Player 2's option (int8)
  optionP1: number;     // Player 1's option (int8)
  keyGame: string;      // Player 1's keygame
};

function fetchGameData(rawGameData: any) {
  
  const gameData: GameData = {
    hashOptionP1: rawGameData[0],
    timeOut: rawGameData[1],
    timeOutP1: rawGameData[2],
    timeOutP2: rawGameData[3],
    nLockTime: rawGameData[4],
    isOdd: rawGameData[5],
    player1: rawGameData[6],
    player2: rawGameData[7],
    optionP2: Number(rawGameData[8]),
    optionP1: Number(rawGameData[9]),
    keyGame: rawGameData[10]
  };
  return gameData;
}

function hexStringToUint8Array(hexString: string): Uint8Array {
  return ethers.getBytes(hexString.startsWith("0x") ? hexString : "0x" + hexString);
}

let keySeed = hexStringToUint8Array ("abcddbe576b4818846aa77e82f4ed5fa78f92766b141f282d36703886d196df39322abcddbe576b4818846aa77e82f4ed5fa78f92766b141f282d36703886d196df39322")
let gameKey = ethers.keccak256(keySeed);

const DEFAULT_BID = ethers.parseEther("0.01");

describe("OddOrEven", function () {

  let oddOrEven: any;
  let owner: any;
  let player1: any;
  let player2: any;

  before(function () {
    initTestRun({ network: "hardhat" });
  });

  afterEach(function () {
    finalizeTest(this);
  });

  after(function () {
    const reportPath = writeRunReport();
    if (reportPath) {
      console.log(`\nRelatório JSON gravado em: ${reportPath}\n`);
    }
  });

  beforeEach(async function () {
    beginTest(this.currentTest?.title ?? "unknown");

    [owner, player1, player2] = await ethers.getSigners();

    oddOrEven = await ethers.deployContract("OddOrEven");
  
  });
  
  it("should have created", async function () {

    let gameData = fetchGameData(await oddOrEven.gameData());
    expect(gameData.optionP2).to.equal(-1);
  });

  
  it("should init game", async function () {
   
    let player1Instance = oddOrEven.connect(player1);
    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = false;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID,});

    let gameData = fetchGameData(await oddOrEven.gameData()); 
    expect(gameData.hashOptionP1).to.equal(hashOptionP1In);
  });

  

  it("should NOT init game (Invalid Bid)", async function () {

    const player1Instance = oddOrEven.connect(player1);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = false;

    await expect(player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID - 1n}))
    .to.be.revertedWith("Invalid Bid");
  });  
  
  it("should NOT init game (Player1 already chose)", async function () {

    const player1Instance = oddOrEven.connect(player1);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    
    let isOdd = false;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    await expect(player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID}))
    .to.be.revertedWith("Player1 already chose");
  });

  it("should quit game", async function () {
    

    const player1Instance = oddOrEven.connect(player1);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    let isOdd = false;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceOwnerbefore = await ethers.provider.getBalance(owner.address);
    let balanceContractBefore = await ethers.provider.getBalance(oddOrEven);

    const tx = await player1Instance.quitGame();
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    // Retrieve gas used and gas price
    const gasUsed = receipt!.gasUsed; // BigNumber
    const gasPrice = tx.gasPrice; // BigNumber
    // Calculate the fee (gas used * gas price)
    const fee = gasUsed * gasPrice;

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceOwnerafter = await ethers.provider.getBalance(owner.address);
    let balanceContractAfter = await ethers.provider.getBalance(oddOrEven);
  
    let gameData = fetchGameData(await oddOrEven.gameData());

    //Verificação da distribuição de saldo do contrato após o cancelamento
    expect((balanceOwnerafter - balanceOwnerbefore) + (balanceP1after - balanceP1before + BigInt(fee))).to.equal(balanceContractBefore);
    //Verificação do saldo do dono do contrato
    expect(balanceContractBefore - (balanceP1after - balanceP1before + BigInt(fee))).to.equal(balanceOwnerafter - balanceOwnerbefore);
    //Verificação do jogo resetado
    expect(gameData.hashOptionP1).to.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
  });

  

  it("should NOT quit game (Accepted)", async function () {
    
    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = false;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(4, {value: DEFAULT_BID});

    await expect(player1Instance.quitGame())
    .to.be.revertedWith("Cant quit game after other player accpetance");
  });

  
  it("should NOT quit game (Not Player 1)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = false;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    await expect(player2Instance.quitGame())
    .to.be.revertedWith("Only player1 can quit the game");
  });

  it("should accept game", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str))); 
 
    let isOdd = false;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    let balanceOwnerbefore = await ethers.provider.getBalance(owner.address);
    let balanceContractBefore = await ethers.provider.getBalance(oddOrEven);

    await player2Instance.acceptGame(4, {value: DEFAULT_BID});

    let balanceOwnerafter = await ethers.provider.getBalance(owner.address);
    let balanceContractAfter = await ethers.provider.getBalance(oddOrEven);

    gameData = fetchGameData(await oddOrEven.gameData());
   
    //Verificação do saldo do dono do contrato
    expect((balanceOwnerafter - balanceOwnerbefore) + balanceContractAfter).to.equal( 2n * balanceContractBefore);
    //Verificação do jogo aceito
    expect(gameData.optionP2).to.equal(4);
  });

  it("should NOT accept game (Already Accepted)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    let isOdd = false;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(4, {value: DEFAULT_BID});

    const player3Instance = oddOrEven.connect(owner);

    gameData = fetchGameData(await oddOrEven.gameData());

    await expect(player3Instance.acceptGame(5, {value: DEFAULT_BID}))
    .to.be.revertedWith("Game Already Accepted");
  });

  it("should NOT accept game (Negative Option)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = false;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    await expect(player2Instance.acceptGame(-4, {value: DEFAULT_BID}))
    .to.be.revertedWith("Cannot accept negative numbers");
  });

  it("should NOT accept game (Invalid Amount)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = false;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    await expect(player2Instance.acceptGame(4, {value: DEFAULT_BID + 1n}))
    .to.be.revertedWith("Invalid amount");
  });

  it("should NOT accept game (Timestap == Nlocktime)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = false;
    
    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime)]);

    await expect(player2Instance.acceptGame(4, {value: DEFAULT_BID}))
    .to.be.revertedWith("TX locktime cant be lower than base locktime");
  });


  it("should NOT accept game (Timout Player 1)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    let isOdd = false;

    const latestBlock = await ethers.provider.getBlock("latest");
    //const latestTimestamp = latestBlock.timestamp;

    if(latestBlock){

      await ethers.provider.send("evm_setNextBlockTimestamp", [latestBlock.timestamp + 2]);
      await ethers.provider.send("evm_mine", []);

    }
      
    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + Number(gameData.timeOut) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(player2Instance.acceptGame(4, {value: DEFAULT_BID}))
    .to.be.revertedWith("Cannot accept after player 1 timeout");
  });

  it("should NOT result game (Not Accepted)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = false;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In))
    .to.revertedWith("Cant verify result before player 2 accpetance");
  });

  it("should give victory to Player 1 ( 3 + 5 even)", async function () {
    console.log("\n========== TESTE: GIVE VICTORY TO PLAYER 1 (FLUXO FELIZ COMPLETO) ==========");
    console.log("Este teste demonstra o cenário completo: Player1 inicializa, Player2 aceita,");
    console.log("Player1 revela corretamente e recebe o prêmio. Player2 permanece inalterado.\n");

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    console.log("PASSO 1: Preparando dados do Player1");
    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = false;
    console.log(`  -> Opção P1: ${optionP1In} (par = false)`);
    console.log(`  -> Chave secreta (keygame): ${keygame}`);
    console.log(`  -> Hash commit: ${hashOptionP1In}`);
    console.log(`  -> Player1 enviará aposta: ${ethers.formatEther(DEFAULT_BID)} ETH`);

    console.log("\nPASSO 2: Player1 executa playerInit() com hash commit");
    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});
    console.log(`  -> playerInit executado com sucesso`);

    let gameData = fetchGameData(await oddOrEven.gameData());
    console.log(`  -> nLockTime (deadline mínimo antes de acceptGame) armazenado: ${gameData.nLockTime}`);
    console.log(`  -> Saldo do contrato aumentou: ${ethers.formatEther(DEFAULT_BID)} ETH`);

    console.log("\nPASSO 3: Avançar tempo de blockchain para satisfazer require de acceptGame");
    console.log(`  -> Requirement: block.timestamp > nLockTime`);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);
    console.log(`  -> Tempo avançado para: ${Number(gameData.nLockTime) + 1}`);
    console.log(`  -> Bloco minerado com sucesso`);

    console.log("\nPASSO 4: Player2 aceita a partida");
    console.log(`  -> Player2 escolhe opção: 5 (ímpar)`);
    console.log(`  -> Cálculo esperado: 3 (P1 par) + 5 (P2 ímpar) = 8 (RESULTADO FINAL: PAR)`);
    await player2Instance.acceptGame(5, {value: DEFAULT_BID});
    console.log(`  -> acceptGame executado com sucesso`);

    gameData = fetchGameData(await oddOrEven.gameData());
    console.log(`  -> optionP2 registrado: ${gameData.optionP2}`);
    console.log(`  -> Player2 registrado: ${gameData.player2}`);
    console.log(`  -> Saldo do contrato agora: ${ethers.formatEther(DEFAULT_BID * 2n)} ETH (aposta de P1 + P2)`);

    console.log("\nPASSO 5: Capturar saldos ANTES da revelação");
    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);
    let balanceContract = await ethers.provider.getBalance(oddOrEven);
    const balanceContractBefore = balanceContract;
    console.log(`  -> Saldo P1 antes: ${ethers.formatEther(balanceP1before)} ETH`);
    console.log(`  -> Saldo P2 antes: ${ethers.formatEther(balanceP2before)} ETH`);
    console.log(`  -> Saldo contrato antes: ${ethers.formatEther(balanceContract)} ETH`);

    console.log("\nPASSO 6: Player1 revela chave original + opção original");
    console.log(`  -> Chave revelada: ${keygame}`);
    console.log(`  -> Opção revelada: ${optionP1In} (par)`);
    console.log(`  -> O contrato vai verificar: keccak256(${keygame} || ${optionP1In}) == ${hashOptionP1In}`);
    console.log(`  -> RESULTADO: Hash bate! Player1 estava sendo honesto.`);
    await player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In);
    console.log(`  -> resultGame executado com sucesso`);

    console.log("\nPASSO 7: Capturar saldos DEPOIS da revelação");
    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);
    balanceContract = await ethers.provider.getBalance(oddOrEven);

    gameData = fetchGameData(await oddOrEven.gameData());

    let gameDataLast = fetchGameData(await oddOrEven.lastGameRecord());
    console.log(`  -> Saldo P1 depois: ${ethers.formatEther(balanceP1after)} ETH`);
    console.log(`  -> Saldo P2 depois: ${ethers.formatEther(balanceP2after)} ETH`);
    console.log(`  -> Saldo contrato depois: ${ethers.formatEther(balanceContract)} ETH`);

    console.log("\nPASSO 8: Calcular e validar resultados");
    const deltaP1 = balanceP1after - balanceP1before;
    const deltaP2 = balanceP2after - balanceP2before;
    console.log(`  -> Variação P1: ${ethers.formatEther(deltaP1)} ETH (positivo - recebeu as apostas)`);
    console.log(`  -> Variação P2: ${ethers.formatEther(deltaP2)} ETH (zero - perdeu ou não ganhou)`);
    
    if (deltaP1 > deltaP2) {
      console.log(`  -> VENCEDOR: Jogador 1 ✓`);
    } else if (deltaP2 > deltaP1) {
      console.log(`  -> VENCEDOR: Jogador 2`);
    } else {
      console.log(`  -> VENCEDOR: Empate`);
    }
    
    console.log(`  -> lastGameRecord.keyGame: ${gameDataLast.keyGame}`);
    console.log(`  -> Esperado: ${gameKey}`);

    console.log("\nPASSO 9: Validações finais");
    expect(balanceP1after > balanceP1before).to.equal(true);
    console.log(`  ✓ P1 ganhou (saldo aumentou)`);
    expect(balanceP2after == balanceP2before).to.equal(true);
    console.log(`  ✓ P2 manteve seu saldo (não ganhou, não perdeu)`);
    expect(gameDataLast.keyGame).to.equal(gameKey);
    console.log(`  ✓ Chave foi registrada corretamente`);
    console.log("✓ Todas as assertions passaram! Fluxo feliz funcionou perfeitamente.\n");

    recordGameOutcome({
      scenario: "happy_path",
      description: "Fluxo feliz completo: P1 revela chave e opção corretas",
      resolution: "resultGame",
      isOdd,
      optionP1: optionP1In,
      optionP2: 5,
      hashOptionP1: hashOptionP1In,
      keyGame: keygame,
      balanceP1before,
      balanceP2before,
      balanceContractBefore,
      balanceP1after,
      balanceP2after,
      balanceContractAfter: balanceContract,
      lastGameRecord: gameDataLast,
      steps: [
        { step: 1, label: "Preparar commit", action: "prepare", data: { optionP1: optionP1In, isOdd } },
        { step: 2, label: "Player1 inicia partida", action: "playerInit" },
        { step: 3, label: "Avançar block.timestamp", action: "evm_mine" },
        { step: 4, label: "Player2 aceita", action: "acceptGame", data: { optionP2: 5 } },
        { step: 5, label: "Capturar saldos antes da revelação", action: "snapshot" },
        { step: 6, label: "Player1 revela resultado", action: "resultGame" },
        { step: 7, label: "Validar vencedor e lastGameRecord", action: "assert" },
      ],
    });
  });

  it("should give victory to Player 1 ( 3 + 4 odd)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 3;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = true;

    console.log("PASSO 1: player1.playerInit() — enviando compromisso e aposta");
    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());
    console.log("  -> nLockTime armazenado:", Number(gameData.nLockTime));

    console.log("PASSO 2: avançando tempo para satisfazer require de acceptGame (block.timestamp > nLockTime)");
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);
    console.log("  -> tempo avançado e bloco minerado");

    console.log("PASSO 3: player2.acceptGame() — player2 envia aposta e opção correspondentes");
    await player2Instance.acceptGame(4, {value: DEFAULT_BID});

    gameData = fetchGameData(await oddOrEven.gameData());
    console.log("  -> acceptGame registrou optionP2:", gameData.optionP2, " player2:", gameData.player2);

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);
    let balanceContract = await ethers.provider.getBalance(oddOrEven);
    const balanceContractBefore = balanceContract;
    console.log("PASSO 4: saldos antes do resultado -> p1:", balanceP1before.toString(), " p2:", balanceP2before.toString(), " contrato:", balanceContract.toString());

    console.log("PASSO 5: player1.resultGame() — player1 revela chave + opção");
    await player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In);

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);
    balanceContract = await ethers.provider.getBalance(oddOrEven);

    gameData = fetchGameData(await oddOrEven.gameData());

    let gameDataLast = fetchGameData(await oddOrEven.lastGameRecord());
    console.log("RESULTADO: saldos após resultado -> p1:", balanceP1after.toString(), " p2:", balanceP2after.toString(), " contrato:", balanceContract.toString());
    const deltaP1 = balanceP1after - balanceP1before;
    const deltaP2 = balanceP2after - balanceP2before;
    console.log("    -> variação p1:", deltaP1.toString(), " (", ethers.formatEther(deltaP1), "ETH )");
    console.log("    -> variação p2:", deltaP2.toString(), " (", ethers.formatEther(deltaP2), "ETH )");
    if (deltaP1 > deltaP2) {
      console.log("VENCEDOR: Jogador 1");
    } else if (deltaP2 > deltaP1) {
      console.log("VENCEDOR: Jogador 2");
    } else {
      console.log("VENCEDOR: Empate");
    }
    console.log("RESULTADO: lastGameRecord.keyGame ->", gameDataLast.keyGame);
  
    expect(balanceP1after > balanceP1before).to.equal(true);
    expect(balanceP2after == balanceP2before).to.equal(true);
    expect(gameDataLast.keyGame).to.equal(gameKey);

    recordGameOutcome({
      scenario: "happy_path",
      description: "P1 vence com soma ímpar (3 + 4)",
      resolution: "resultGame",
      isOdd,
      optionP1: optionP1In,
      optionP2: 4,
      hashOptionP1: hashOptionP1In,
      keyGame: keygame,
      balanceP1before,
      balanceP2before,
      balanceContractBefore,
      balanceP1after,
      balanceP2after,
      balanceContractAfter: balanceContract,
      lastGameRecord: gameDataLast,
    });
  });

  it("should give victory to Player 1 ( 2 + 4 even)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = false;

    console.log("PASSO 1: player1.playerInit() — enviando compromisso e aposta");
    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());
    console.log("  -> nLockTime armazenado:", Number(gameData.nLockTime));

    console.log("PASSO 2: avançando tempo para satisfazer require de acceptGame (block.timestamp > nLockTime)");
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);
    console.log("  -> tempo avançado e bloco minerado");

    console.log("PASSO 3: player2.acceptGame() — player2 envia aposta e opção correspondentes");
    await player2Instance.acceptGame(4, {value: DEFAULT_BID});

    gameData = fetchGameData(await oddOrEven.gameData());
    console.log("  -> acceptGame registrou optionP2:", gameData.optionP2, " player2:", gameData.player2);

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);
    let balanceContract = await ethers.provider.getBalance(oddOrEven);
    const balanceContractBefore = balanceContract;
    console.log("PASSO 4: saldos antes do resultado -> p1:", balanceP1before.toString(), " p2:", balanceP2before.toString(), " contrato:", balanceContract.toString());

    console.log("PASSO 5: player1.resultGame() — player1 revela chave + opção");
    await player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In);

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);
    balanceContract = await ethers.provider.getBalance(oddOrEven);

    gameData = fetchGameData(await oddOrEven.gameData());

    let gameDataLast = fetchGameData(await oddOrEven.lastGameRecord());
    console.log("RESULTADO: saldos após resultado -> p1:", balanceP1after.toString(), " p2:", balanceP2after.toString(), " contrato:", balanceContract.toString());
    const deltaP1 = balanceP1after - balanceP1before;
    const deltaP2 = balanceP2after - balanceP2before;
    console.log("    -> variação p1:", deltaP1.toString(), " (", ethers.formatEther(deltaP1), "ETH )");
    console.log("    -> variação p2:", deltaP2.toString(), " (", ethers.formatEther(deltaP2), "ETH )");
    if (deltaP1 > deltaP2) {
      console.log("VENCEDOR: Jogador 1");
    } else if (deltaP2 > deltaP1) {
      console.log("VENCEDOR: Jogador 2");
    } else {
      console.log("VENCEDOR: Empate");
    }
    console.log("RESULTADO: lastGameRecord.keyGame ->", gameDataLast.keyGame);
  
    expect(balanceP1after > balanceP1before).to.equal(true);
    expect(balanceP2after == balanceP2before).to.equal(true);
    expect(gameDataLast.keyGame).to.equal(gameKey);

    recordGameOutcome({
      scenario: "happy_path",
      description: "P1 vence com soma par (2 + 4)",
      resolution: "resultGame",
      isOdd,
      optionP1: optionP1In,
      optionP2: 4,
      hashOptionP1: hashOptionP1In,
      keyGame: keygame,
      balanceP1before,
      balanceP2before,
      balanceContractBefore,
      balanceP1after,
      balanceP2after,
      balanceContractAfter: balanceContract,
      lastGameRecord: gameDataLast,
    });
  });

  it("should give victory to Player 1 ( 2 + 5 odd)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = true;

    console.log("PASSO 1: player1.playerInit() — enviando compromisso e aposta");
    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());
    console.log("  -> nLockTime armazenado:", Number(gameData.nLockTime));

    console.log("PASSO 2: avançando tempo para satisfazer require de acceptGame (block.timestamp > nLockTime)");
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);
    console.log("  -> tempo avançado e bloco minerado");

    console.log("PASSO 3: player2.acceptGame() — player2 envia aposta e opção correspondentes");
    await player2Instance.acceptGame(5, {value: DEFAULT_BID});

    gameData = fetchGameData(await oddOrEven.gameData());
    console.log("  -> acceptGame registrou optionP2:", gameData.optionP2, " player2:", gameData.player2);

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);
    let balanceContract = await ethers.provider.getBalance(oddOrEven);
    const balanceContractBefore = balanceContract;
    console.log("PASSO 4: saldos antes do resultado -> p1:", balanceP1before.toString(), " p2:", balanceP2before.toString(), " contrato:", balanceContract.toString());

    console.log("PASSO 5: player1.resultGame() — player1 revela chave + opção");
    await player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In);

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);
    balanceContract = await ethers.provider.getBalance(oddOrEven);

    gameData = fetchGameData(await oddOrEven.gameData());

    let gameDataLast = fetchGameData(await oddOrEven.lastGameRecord());
    console.log("RESULTADO: saldos após resultado -> p1:", balanceP1after.toString(), " p2:", balanceP2after.toString(), " contrato:", balanceContract.toString());
    const deltaP1 = balanceP1after - balanceP1before;
    const deltaP2 = balanceP2after - balanceP2before;
    console.log("    -> variação p1:", deltaP1.toString(), " (", ethers.formatEther(deltaP1), "ETH )");
    console.log("    -> variação p2:", deltaP2.toString(), " (", ethers.formatEther(deltaP2), "ETH )");
    if (deltaP1 > deltaP2) {
      console.log("VENCEDOR: Jogador 1");
    } else if (deltaP2 > deltaP1) {
      console.log("VENCEDOR: Jogador 2");
    } else {
      console.log("VENCEDOR: Empate");
    }
    console.log("RESULTADO: lastGameRecord.keyGame ->", gameDataLast.keyGame);
  
    expect(balanceP1after > balanceP1before).to.equal(true);
    expect(balanceP2after == balanceP2before).to.equal(true);
    expect(gameDataLast.keyGame).to.equal(gameKey);

    recordGameOutcome({
      scenario: "happy_path",
      description: "P1 vence com soma ímpar (2 + 5)",
      resolution: "resultGame",
      isOdd,
      optionP1: optionP1In,
      optionP2: 5,
      hashOptionP1: hashOptionP1In,
      keyGame: keygame,
      balanceP1before,
      balanceP2before,
      balanceContractBefore,
      balanceP1after,
      balanceP2after,
      balanceContractAfter: balanceContract,
      lastGameRecord: gameDataLast,
    });
  });

  it("should give victory to Player 2 (wrong p1 keygame)", async function () {
    console.log("\n========== TESTE: WRONG P1 KEYGAME (REVELAÇÃO COM CHAVE INVÁLIDA) ==========");
    console.log("Este teste simula uma tentativa de trapaça onde Player1 tenta revelar uma chave diferente da original.");
    console.log("O contrato deve detectar isso porque o hash não corresponderá ao commit.\n");

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    console.log("PASSO 1: Preparando dados do Player1");
    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = true;
    console.log(`  -> Chave original (keygame): ${keygame}`);
    console.log(`  -> Opção original (optionP1In): ${optionP1In}`);
    console.log(`  -> Hash commit original: ${hashOptionP1In}`);
    console.log(`  -> Player1 enviará aposta: ${ethers.formatEther(DEFAULT_BID)} ETH`);

    console.log("\nPASSO 2: Player1 faz playerInit() com o hash commit");
    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});
    console.log(`  -> playerInit executado com sucesso`);
    console.log(`  -> Saldo do contrato aumentou: ${ethers.formatEther(DEFAULT_BID)} ETH`);

    let gameData = fetchGameData(await oddOrEven.gameData());
    console.log(`  -> nLockTime (deadline mínimo) definido como: ${gameData.nLockTime}`);

    console.log("\nPASSO 3: Avançar tempo de blockchain para satisfazer o require de acceptGame");
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);
    console.log(`  -> Tempo avançado para: ${Number(gameData.nLockTime) + 1}`);
    console.log(`  -> Bloco minerado`);

    console.log("\nPASSO 4: Player2 aceita a partida com opção diferente (5 = ímpar)");
    await player2Instance.acceptGame(5, {value: DEFAULT_BID});
    console.log(`  -> acceptGame executado`);
    console.log(`  -> Player2 escolheu opção: 5 (ímpar)`);
    console.log(`  -> Saldo do contrato: ${ethers.formatEther(DEFAULT_BID * 2n)} ETH`);

    gameData = fetchGameData(await oddOrEven.gameData());

    console.log("\nPASSO 5: Capturar saldos ANTES da revelação");
    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);
    let balanceContract = await ethers.provider.getBalance(oddOrEven);
    const balanceContractBefore = balanceContract;
    console.log(`  -> Saldo P1 antes: ${ethers.formatEther(balanceP1before)} ETH`);
    console.log(`  -> Saldo P2 antes: ${ethers.formatEther(balanceP2before)} ETH`);
    console.log(`  -> Saldo contrato antes: ${ethers.formatEther(balanceContract)} ETH`);

    console.log("\nPASSO 6: AQUI VEM A TRAPAÇA - Player1 tenta revelar com CHAVE INVÁLIDA");
    let invalidKey = hexStringToUint8Array(keygame.substring(0, keygame.length - 2) + "ab");
    console.log(`  -> Chave original era: ${keygame}`);
    console.log(`  -> Chave FALSA que Player1 está tentando: ${keygame.substring(0, keygame.length - 2)}ab`);
    console.log(`  -> Opção: ${optionP1In}`);
    console.log(`  -> O contrato vai rejeitar isso porque keccak256(chavefalsa || opcao) ≠ hashcommit original`);
    console.log(`  -> RESULTADO: Player1 perde a aposta, Player2 recebe o prêmio!\n`);

    await player1Instance.resultGame(invalidKey, optionP1In);

    console.log("PASSO 7: Capturar saldos DEPOIS da revelação inválida");
    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);
    balanceContract = await ethers.provider.getBalance(oddOrEven);
  
    gameData = fetchGameData(await oddOrEven.gameData());

    console.log(`  -> Saldo P1 depois: ${ethers.formatEther(balanceP1after)} ETH`);
    console.log(`  -> Saldo P2 depois: ${ethers.formatEther(balanceP2after)} ETH`);
    console.log(`  -> Saldo contrato depois: ${ethers.formatEther(balanceContract)} ETH`);

    console.log("\nPASSO 8: Validar resultados");
    let variationP1 = balanceP1after - balanceP1before;
    let variationP2 = balanceP2after - balanceP2before;
    console.log(`  -> Variação P1: ${ethers.formatEther(variationP1)} ETH (deve ser negativo ou zero)`);
    console.log(`  -> Variação P2: ${ethers.formatEther(variationP2)} ETH (deve ser positivo - recebeu prêmio)`);

    expect(balanceP1after <= balanceP1before).to.equal(true);
    expect(balanceP2after > balanceP2before).to.equal(true);
    console.log("✓ Assertions passaram! Trapaça foi detectada e punida corretamente.\n");

    const revealedKeyGame = `${keygame.substring(0, keygame.length - 2)}ab`;
    recordGameOutcome({
      scenario: "fraud_wrong_key",
      description: "P1 revela chave inválida; P2 vence",
      resolution: "resultGame",
      isOdd,
      optionP1: optionP1In,
      optionP2: 5,
      hashOptionP1: hashOptionP1In,
      keyGame: keygame,
      revealedKeyGame,
      fraudDetected: true,
      balanceP1before,
      balanceP2before,
      balanceContractBefore,
      balanceP1after,
      balanceP2after,
      balanceContractAfter: balanceContract,
    });
  });

  it("should give victory to Player 2 (wrong p1 option)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = true;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(5, {value: DEFAULT_BID});

    gameData = fetchGameData(await oddOrEven.gameData());

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);
    let balanceContract = await ethers.provider.getBalance(oddOrEven);
    const balanceContractBefore = balanceContract;

    await player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In - 1);

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);
    balanceContract = await ethers.provider.getBalance(oddOrEven);
  
    gameData = fetchGameData(await oddOrEven.gameData());

    let gameDataLast = fetchGameData(await oddOrEven.lastGameRecord());
  
    expect(balanceP1after <= balanceP1before).to.equal(true);
    expect(balanceP2after > balanceP2before).to.equal(true);
    expect(gameDataLast.keyGame).to.equal(gameKey);

    recordGameOutcome({
      scenario: "fraud_wrong_option",
      description: "P1 revela opção errada; P2 vence",
      resolution: "resultGame",
      isOdd,
      optionP1: optionP1In - 1,
      optionP2: 5,
      hashOptionP1: hashOptionP1In,
      keyGame: keygame,
      fraudDetected: true,
      balanceP1before,
      balanceP2before,
      balanceContractBefore,
      balanceP1after,
      balanceP2after,
      balanceContractAfter: balanceContract,
      lastGameRecord: gameDataLast,
    });
  });

  it("should give victory to Player 2 (negative p1 option)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = -2;
    let optionP1str = (optionP1In & 0xff).toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = true;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(5, {value: DEFAULT_BID});

    gameData = fetchGameData(await oddOrEven.gameData());

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);
    let balanceContract = await ethers.provider.getBalance(oddOrEven);
    const balanceContractBefore = balanceContract;

    await player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In);

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);
    balanceContract = await ethers.provider.getBalance(oddOrEven);
  
    gameData = fetchGameData(await oddOrEven.gameData());

    let gameDataLast = fetchGameData(await oddOrEven.lastGameRecord());
  
    expect(balanceP1after <= balanceP1before).to.equal(true);
    expect(balanceP2after > balanceP2before).to.equal(true);
    expect(gameDataLast.keyGame).to.equal(gameKey);

    recordGameOutcome({
      scenario: "fraud_negative_option",
      description: "P1 revela opção negativa; P2 vence",
      resolution: "resultGame",
      isOdd,
      optionP1: optionP1In,
      optionP2: 5,
      hashOptionP1: hashOptionP1In,
      keyGame: keygame,
      fraudDetected: true,
      balanceP1before,
      balanceP2before,
      balanceContractBefore,
      balanceP1after,
      balanceP2after,
      balanceContractAfter: balanceContract,
      lastGameRecord: gameDataLast,
    });
  });

  it("should claim game", async function () {
    console.log("\n========== TESTE: CLAIM GAME (TIMEOUT E RECUPERAÇÃO) ==========");
    console.log("Este teste demonstra o mecanismo de proteção quando Player1 não revela a chave a tempo.");
    console.log("Player2 pode chamar claimGame() para recuperar sua aposta com uma compensação.\n");

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    console.log("PASSO 1: Preparando dados do Player1");
    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = true;
    console.log(`  -> Opção original (optionP1In): ${optionP1In}`);
    console.log(`  -> Hash commit: ${hashOptionP1In}`);
    console.log(`  -> Player1 enviará aposta: ${ethers.formatEther(DEFAULT_BID)} ETH`);

    console.log("\nPASSO 2: Player1 faz playerInit() com o hash commit");
    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});
    console.log(`  -> playerInit executado com sucesso`);

    let gameData = fetchGameData(await oddOrEven.gameData());
    console.log(`  -> nLockTime (deadline mínimo) definido como: ${gameData.nLockTime}`);

    console.log("\nPASSO 3: Avançar tempo de blockchain para satisfazer require de acceptGame");
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);
    console.log(`  -> Tempo avançado para: ${Number(gameData.nLockTime) + 1}`);
    console.log(`  -> Bloco minerado`);

    console.log("\nPASSO 4: Player2 aceita a partida com opção 5 (ímpar)");
    await player2Instance.acceptGame(5, {value: DEFAULT_BID});
    console.log(`  -> acceptGame executado`);
    console.log(`  -> Player2 escolheu opção: 5 (ímpar)`);
    console.log(`  -> Player2 enviou aposta: ${ethers.formatEther(DEFAULT_BID)} ETH`);

    gameData = fetchGameData(await oddOrEven.gameData());

    console.log("\nPASSO 5: SIMULAR TIMEOUT - Player1 NÃO revela a chave no prazo");
    console.log(`  -> timeOutP2 (deadline para Player1 revelar): ${gameData.timeOutP2}`);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.timeOutP2) + 1]);
    await ethers.provider.send("evm_mine", []);
    console.log(`  -> Tempo avançado para: ${Number(gameData.timeOutP2) + 1}`);
    console.log(`  -> TIMEOUT ACIONADO! Player1 perdeu o prazo de ${gameData.timeOutP2 - gameData.nLockTime} segundos`);
    console.log(`  -> Player2 agora pode chamar claimGame() para recuperar sua aposta!\n`);

    console.log("PASSO 6: Capturar saldos ANTES do claim");
    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);
    let balanceContract = await ethers.provider.getBalance(oddOrEven);
    const balanceContractBefore = balanceContract;
    console.log(`  -> Saldo P1 antes: ${ethers.formatEther(balanceP1before)} ETH`);
    console.log(`  -> Saldo P2 antes: ${ethers.formatEther(balanceP2before)} ETH`);
    console.log(`  -> Saldo contrato antes: ${ethers.formatEther(balanceContract)} ETH`);

    console.log("\nPASSO 7: Player2 chama claimGame() para reivindicar a compensação");
    await player2Instance.claimGame();
    console.log(`  -> claimGame() executado com sucesso`);
    console.log(`  -> O contrato devolveu a aposta de Player2 + compensação por timeout`);

    console.log("\nPASSO 8: Capturar saldos DEPOIS do claim");
    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);
    balanceContract = await ethers.provider.getBalance(oddOrEven);
  
    gameData = fetchGameData(await oddOrEven.gameData());

    let gameDataLast = fetchGameData(await oddOrEven.lastGameRecord());
  
    console.log(`  -> Saldo P1 depois: ${ethers.formatEther(balanceP1after)} ETH`);
    console.log(`  -> Saldo P2 depois: ${ethers.formatEther(balanceP2after)} ETH`);
    console.log(`  -> Saldo contrato depois: ${ethers.formatEther(balanceContract)} ETH`);

    console.log("\nPASSO 9: Validar resultados");
    let variationP1 = balanceP1after - balanceP1before;
    let variationP2 = balanceP2after - balanceP2before;
    console.log(`  -> Variação P1: ${ethers.formatEther(variationP1)} ETH (não mudou - P1 perdeu no timeout)`);
    console.log(`  -> Variação P2: ${ethers.formatEther(variationP2)} ETH (positivo - recebeu aposta de volta + compensação)`);
    console.log(`  -> lastGameRecord.keyGame: ${gameDataLast.keyGame} (zerado após claim)`);

    expect(balanceP1after == balanceP1before).to.equal(true);
    expect(balanceP2after > balanceP2before).to.equal(true);
    expect(gameDataLast.keyGame).to.equal("0x");
    console.log("✓ Assertions passaram! Timeout e claim funcionaram corretamente.\n");

    recordGameOutcome({
      scenario: "timeout_claim",
      description: "P1 não revela a tempo; P2 reivindica via claimGame",
      resolution: "claimGame",
      isOdd,
      optionP1: optionP1In,
      optionP2: 5,
      hashOptionP1: hashOptionP1In,
      keyGame: keygame,
      balanceP1before,
      balanceP2before,
      balanceContractBefore,
      balanceP1after,
      balanceP2after,
      balanceContractAfter: balanceContract,
      lastGameRecord: gameDataLast,
      steps: [
        { step: 1, label: "Player1 inicia partida", action: "playerInit" },
        { step: 2, label: "Player2 aceita", action: "acceptGame", data: { optionP2: 5 } },
        { step: 3, label: "Simular timeout de P1", action: "evm_setNextBlockTimestamp" },
        { step: 4, label: "Player2 reivindica prêmio", action: "claimGame" },
      ],
    });
  });

  it("should NOT claim game (Not Accepted)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = true;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(player2Instance.claimGame()).to.be.revertedWith("Only accepted game can be claimed");
  });

  it("should NOT claim game (Timeout P2)", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = true;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(5, {value: DEFAULT_BID});

    gameData = fetchGameData(await oddOrEven.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.timeOutP2) - 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(player2Instance.claimGame()).to.be.revertedWith("Game can only be claimed afther Player 2 timeout");
  });

  it("should Init game again", async function () {
    

    const player1Instance = oddOrEven.connect(player1);
    const player2Instance = oddOrEven.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    let isOdd = true;

    await player1Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await oddOrEven.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(5, {value: DEFAULT_BID});

    gameData = fetchGameData(await oddOrEven.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.timeOutP2) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.claimGame();

    await player2Instance.playerInit(isOdd, hashOptionP1In, {value: DEFAULT_BID});

    let gameDataLast = fetchGameData(await oddOrEven.lastGameRecord());

    expect(gameDataLast.hashOptionP1).to.equal(hashOptionP1In);
  });
  
  
});