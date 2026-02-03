# 🌸 JoyBomber 💣

Uma experiência "kawaii" e frenética inspirada no clássico Bomberman, construída com foco em estética premium, jogabilidade fluida e multiplayer em tempo real.

> **💖 A Inspiração:** Este jogo foi criado especialmente para tirar uma grande amiga do tédio! Pensado para quem ama a Hello Kitty e precisa de uma dose de fofura e diversão durante aquelas pausas no trabalho quando não tem muito o que fazer. ✨

![JoyBomber Cover](/public/images/capa%20do%20jogo.png)

## ✨ Características

- 🎮 **Multiplayer em Tempo Real**: Jogue com amigos através de salas privadas usando **Supabase Realtime**.
- 🎀 **Estética Kawaii**: Design cuidadosamente planejado com paleta de cores vibrantes, animações suaves e ícones personalizados da Hello Kitty.
- 🎵 **Imersão Sonora**: Trilha sonora relaxante no lobby e música animada durante as partidas, com controle total de áudio.
- 🏃 **Jogabilidade Fluida**: Sistema de colisão otimizado com *Corner Nudging* (ajuda de quina) para uma movimentação sem travamentos.
- 👗 **Seleção de Personagens**: Escolha entre diferentes heróis no lobby antes de começar a batalha.
- ⚡ **Power-ups Dinâmicos**: Aumente seu poder com itens de Bomba Extra, Alcance de Fogo e Velocidade.

## 🚀 Tecnologias

Este projeto utiliza o que há de mais moderno no desenvolvimento web:

- **React + Vite**: Para uma interface rápida e reativa.
- **Tailwind CSS**: Estilização moderna e responsiva.
- **Supabase Realtime**: Sincronização de estado entre jogadores via broadcast e presence.
- **Lucide React**: Ícones vetoriais elegantes.
- **Framer Motion**: (Se aplicável) Micro-interações e animações.

## 🛠️ Como Executar

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/deloam/joybomber.git
   cd joybomber
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure o ambiente:**
   Crie um arquivo `.env` na raiz do projeto e adicione suas chaves do Supabase:
   ```env
   VITE_SUPABASE_URL=seu_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

## 🎮 Controles

- **Movimentação**: `WASD` ou `Setas do Teclado`
- **Colocar Bomba**: `Espaço`
- **Sair da Partida**: Botão `✕ SAIR` no canto da tela
- **Áudio**: Botão de `Alto-falante` para ligar/desligar a música

## 📸 Screenshots

<div align="center">
  <img src="/public/prints/print%201.png" width="400" alt="JoyBomber Gameplay 1">
  <img src="/public/prints/print%202.png" width="400" alt="JoyBomber Gameplay 2">
  <br>
  <img src="/public/prints/print%203.png" width="400" alt="JoyBomber Gameplay 3">
  <img src="/public/prints/print%204.png" width="400" alt="JoyBomber Gameplay 4">
</div>

---

Desenvolvido com 💖 para transformar o tédio em diversão.
