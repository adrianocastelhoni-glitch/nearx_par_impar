ReadmeTrabalho - Demonstração do projeto OddOrEven

Objetivo

Guia passo-a-passo para gravar um vídeo de ~5 minutos apresentando a estrutura do projeto e executando 3 testes selecionados (fluxo feliz, revelação inválida, claim por timeout).

Arquivos importantes

- contracts/OddOrEven.sol — contrato principal (commit-reveal, timeouts, comissão)
- contracts/Keccak256Utils.sol — utilitário para concatenar key + option
- test/OddOrEven.test.ts — testes TypeScript com Hardhat/Mocha
- diagram.png — diagrama do fluxo do jogo (C:\empresa\nearx\nx26\evm-projects\oddoreven\diagram.png)

Comandos (executar no terminal do projeto)

1) Entrar na pasta do projeto
   cd C:\empresa\nearx\nx26\evm-projects\oddoreven

2) Compilar contratos
   npx hardhat compile

3) Executar apenas os 3 testes recomendados (grep)
   npx hardhat test mocha test/OddOrEven.test.ts --grep "give victory to Player 1|wrong p1 keygame|claim game"

(Alternativa: executar um teste específico)
   npx hardhat test mocha --grep "give victory to Player 1"

Trechos de teste a destacar durante a gravação

- "give victory to Player 1" — demonstra fluxo completo: player1.playerInit -> advance time -> player2.acceptGame -> player1.resultGame
  Asserts principais: balanceP1after > balanceP1before; balanceP2 unchanged; lastGameRecord.keyGame == gameKey

- "wrong p1 keygame" — demonstra falha de revelação e pagamento a player2
  Mostre a chamada resultGame com key alterada e o assert balanceP2after > balanceP2before

- "claim game" — demonstra timeout e recuperação por player2
  Avance timestamp até timeOutP2, chame claimGame e verifique balanceP2 aumento

O que explicar rapidamente (sugestão de fala)

- Commit-reveal: por que usar keccak256(key||option) — protege contra trapaça
- Comissões: owner recebe porcentagem em acceptGame/quitGame
- Timeouts: player1 tem janela para revelar; player2 pode claim após timeout
- Testes: usam evm_setNextBlockTimestamp / evm_mine para simular tempo

Exemplo de saída esperada

- Compilação: "Compiling 1 files with 0.8.28" (ou similar)
- Testes: "3 passing (XXXms)" e vários PASS para cada caso

Dicas de gravação

- Aumente a fonte do terminal/IDE para legibilidade
- Faça pausa de 1–2s após cada PASS para comentar
- Grave terminal em fullscreen; se preferir corte, grave testes individualmente com --grep
- Mostre o arquivo diagram.png enquanto explica o fluxo

Material opcional que posso gerar

- README com comandos (ok — já gerado aqui)
- Script de narração palavra-por-palavra (posso ajustar ao seu nome)
- Vídeo gravado automaticamente (não disponível)

Contato

Se quiser, adapto o README para inglês, incluo os comandos exatos com exemplos de saída do seu ambiente, ou gero um script de narração pronto para leitura com marcações de tempo.
