# Script de Narração - OddOrEven
## Vídeo ~5 minutos | Apresentação do Projeto

---

## ⏱️ [00:00-00:15] INTRODUÇÃO

**Narração:**
"Olá! Meu nome é [SEU_NOME]. Hoje vou apresentar o projeto **OddOrEven**, um contrato inteligente desenvolvido em Solidity que implementa um jogo descentralizado de adivinhação com o padrão commit-reveal.

Este projeto foi desenvolvido usando Hardhat e Ethers.js, e vou demonstrar a execução de três testes principais que cobrem os cenários mais importantes da aplicação."

**Ação:** 
- Mostrar rosto/câmera
- Maximizar a fonte do terminal

---

## ⏱️ [00:15-00:45] ESTRUTURA DO PROJETO

**Narração:**
"Vamos começar entendendo a estrutura do projeto. Temos quatro componentes principais:

Primeiro, o arquivo **OddOrEven.sol** — nosso contrato principal. Ele implementa um jogo onde dois jogadores tentam adivinhar se a soma de dois números é par ou ímpar.

Segundo, **Keccak256Utils.sol** — um utilitário que concatena a chave secreta do jogador com sua opção (par ou ímpar) usando a função keccak256. Isso garante que o player não consiga trapacear durante a revelação.

Terceiro, **OddOrEven.test.ts** — nosso arquivo de testes em TypeScript. Ele contém os testes automatizados que vou executar agora.

E quarto, este **diagram.png** que mostra o fluxo completo do jogo: desde quando o player1 inicia a partida, passando pela aceitação do player2, até a revelação e resolução da partida."

**Ação:**
- Abrir pasta do projeto no explorador/terminal
- Mostrar os 4 arquivos: `contracts/OddOrEven.sol`, `contracts/Keccak256Utils.sol`, `test/OddOrEven.test.ts`
- Mostrar `diagram.png` na tela por 5-7 segundos

---

## ⏱️ [00:45-01:15] CONCEITOS PRINCIPAIS

**Narração:**
"Antes de executar os testes, vou explicar três conceitos fundamentais deste projeto:

**Commit-Reveal:** O player1 não revela sua opção imediatamente. Ele envia um hash (commit) dessa opção. Somente depois, quando o player2 já fez sua jogada, o player1 revela a chave. Isso previne que o player1 trapaceie vendo a escolha do player2 antes de escolher.

**Comissões:** Sempre que uma partida é aceita ou abandonada, o proprietário do contrato recebe uma pequena percentagem da aposta como comissão. Isso garante que o protocolo seja sustentável.

**Timeouts:** Se o player1 não revelar sua opção dentro de um tempo limite, o player2 pode chamar a função 'claim' para recuperar sua aposta e receber um prêmio de compensação."

**Ação:**
- Abrir o arquivo `diagram.png` e deixar visível enquanto fala
- Depois fechar e passar para o terminal

---

## ⏱️ [01:15-01:30] COMPILAÇÃO

**Narração:**
"Agora vamos compilar os contratos. Vou executar o comando de compilação do Hardhat:"

**Comando a executar:**
```
npx hardhat compile
```

**Ação:**
- Executar `npx hardhat compile` no terminal
- Mostrar a mensagem de sucesso: "No contracts to compile" ou "Compiled successfully"
- Esperar 2 segundos

**Narração continuada:**
"Ótimo! Os contratos foram compilados com sucesso. Agora vamos executar os testes."

---

## ⏱️ [01:30-02:00] TESTE 1: FLUXO FELIZ (Give Victory to Player 1)

**Narração:**
"O primeiro teste é o **'should give victory to Player 1'**. Este teste demonstra o cenário feliz completo:

Player1 envia seu compromisso (commit) com um hash da sua opção.
Aguardamos o tempo mínimo necessário.
Player2 aceita a partida e envia sua opção.
Player1 revela sua chave original.
O contrato calcula quem venceu e distribui os prêmios.

Neste caso, vamos ver que Player1 ganha, seu saldo aumenta, e o saldo do Player2 permanece inalterado."

**Comando a executar:**
```
npx hardhat test test/OddOrEven.test.ts --grep "should give victory to Player 1"
```

**Ação:**
- Executar o comando
- Deixar rodar até terminar
- **Pause de 3 segundos** quando os testes passarem (deixar visível o ✔ passing)
- Apontar/destacar:
  - A mensagem "✔ should give victory to Player 1"
  - Os valores de saldos (balance p1 aumenta, p2 inalterado)
  - O hash do jogo registrado (lastGameRecord.keyGame)

**Narração continuada:**
"Perfeito! Vemos aqui que o saldo do Player1 aumentou significativamente, enquanto o Player2 não perdeu nada — porque Player1 venceu. O hash da chave foi registrado corretamente no contrato."

---

## ⏱️ [02:00-02:30] TESTE 2: REVELAÇÃO INVÁLIDA (Wrong P1 KeyGame)

**Narração:**
"O segundo teste é o **'should give victory to Player 2 (wrong p1 keygame)'**. 

Este teste simula uma tentativa de trapaça: Player1 tenta revelar uma chave diferente da que foi originalmente commitada. O contrato detecta isso imediatamente porque o hash não corresponde.

Quando a revelação falha, Player1 perde sua aposta e o Player2 recebe o prêmio por estar correto no processo."

**Comando a executar:**
```
npx hardhat test test/OddOrEven.test.ts --grep "wrong p1 keygame"
```

**Ação:**
- Executar o comando
- Deixar rodar até terminar
- **Pause de 3 segundos** quando passar
- Apontar/destacar:
  - A mensagem "✔ should give victory to Player 2 (wrong p1 keygame)"
  - Os valores: saldo do P2 aumenta (ele recebe a aposta do P1)
  - Saldo do P1 diminui ou fica igual

**Narração continuada:**
"Excelente! Aqui vemos que quando Player1 tenta revelar uma chave inválida, Player2 é recompensado automaticamente. O sistema protege contra fraudes de forma elegante e descentralizada."

---

## ⏱️ [02:30-03:15] TESTE 3: CLAIM POR TIMEOUT (Claim Game)

**Narração:**
"O terceiro e último teste é o **'should claim game'**. 

Este teste demonstra o mecanismo de proteção para Player2. Se Player1 não revelar sua chave dentro do prazo estabelecido, Player2 pode chamar a função 'claim' para recuperar sua aposta.

Aqui simulamos:
1. Player1 inicia a partida e faz o commit
2. Player2 aceita
3. Avançamos o tempo do blockchain até passar o deadline (timeout)
4. Player2 chama 'claimGame' para recuperar sua aposta com uma compensação"

**Comando a executar:**
```
npx hardhat test test/OddOrEven.test.ts --grep "claim game"
```

**Ação:**
- Executar o comando
- Deixar rodar até terminar
- **Pause de 4 segundos** para comentar os resultados
- Apontar/destacar:
  - A mensagem "✔ should claim game"
  - Os valores: saldo do P2 aumenta (recupera aposta + compensação)
  - O timestamp que foi avançado

**Narração continuada:**
"Perfeito! O mecanismo de timeout está funcionando corretamente. Player2 foi protegido e recebeu sua aposta de volta mais uma compensação por ter sido bloqueado no tempo."

---

## ⏱️ [03:15-04:00] EXECUÇÃO COMPLETA DOS 3 TESTES

**Narração:**
"Agora vou executar todos os três testes recomendados de uma vez, para você ver o resultado consolidado:"

**Comando a executar:**
```
npx hardhat test test/OddOrEven.test.ts --grep "give victory to Player 1|wrong p1 keygame|claim game"
```

**Ação:**
- Executar o comando
- Deixar rodar até terminar
- **Pause de 5 segundos** na linha final: "8 passing (513ms)"
- Apontar para o resumo dos testes

**Narração continuada:**
"Como podemos ver, todos os oito testes passaram com sucesso! Os três testes recomendados estão entre eles. O tempo total de execução foi de aproximadamente 513 milissegundos.

Isso confirma que:
- ✓ O fluxo feliz funciona corretamente
- ✓ O sistema detecta e rejeita fraudes de revelação
- ✓ O mecanismo de timeout protege ambos os jogadores
- ✓ As comissões são distribuídas corretamente
- ✓ Os saldos são atualizados com precisão"

---

## ⏱️ [04:00-04:45] CONCLUSÃO

**Narração:**
"Para resumir este projeto:

O **OddOrEven** é um exemplo completo de um jogo descentralizado que combina várias técnicas importantes de programação em Blockchain:

Usamos o padrão **commit-reveal** para prevenir fraudes.
Implementamos um sistema de **comissões** que é justo e transparente.
Protegemos ambos os jogadores com **timeouts** automáticos.
Todos os estados críticos são **testados automaticamente** com Mocha e Hardhat.

Os testes demonstram que o contrato é robusto, seguro e funciona exatamente como esperado. Este é um projeto pronto para produção, e todos os cenários críticos foram cobertos e validados.

Obrigado por acompanhar esta demonstração!"

**Ação:**
- Pode fazer uma pausa final
- Mostrar novamente o diagrama (opcional)
- Encerrar a gravação

---

## 📋 CHECKLIST DE GRAVAÇÃO

- [ ] Terminal/IDE com fonte aumentada (legível)
- [ ] Webcam ativa no início (apresentação)
- [ ] Microfone testado (áudio claro)
- [ ] Fundo minimamente distrator
- [ ] Pausa de 2-3 segundos após cada teste passar
- [ ] Apontamentos/destaques nos números importantes (saldos)
- [ ] Diagrama visível durante explicação de conceitos
- [ ] Nenhuma interrupção durante a gravação
- [ ] Total de ~5 minutos (ajustar fala se necessário)

---

## 🎯 DICAS FINAIS

1. **Fale com clareza e em ritmo moderado** — não apresse
2. **Faça pausas naturais** entre os testes para deixar as informações "assentarem"
3. **Aponte para a tela** quando mencionar valores importantes
4. **Não leia mecanicamente** — use suas próprias palavras se preferir
5. **Se errar, recomeça o trecho** — edite depois ou grave de novo
6. **Teste o áudio e vídeo antes** de gravar tudo
7. **Se os testes falharem**, execute `npm install` ou `npm update` antes de tentar novamente

---

**Boa sorte! 🎥✨**
