# Joyn Bomber - Guia de Configuração Multiplayer

Este jogo utiliza o Supabase Realtime para sincronização entre jogadores.

## 1. Configuração do Supabase
1. Acesse [Supabase](https://supabase.com) e crie um novo projeto.
2. Assim que criado, vá para **Project Settings** (ícone de engrenagem) -> **API**.
3. Copie a **Project URL** e a chave **anon public**.
4. Este jogo utiliza o **Supabase Realtime**. Ele geralmente vem habilitado por padrão em novos projetos.
   - Certifique-se de que a opção "Realtime" está ATIVA se você verificar nas configurações.
   - Utilizamos o modo "Broadcast", que funciona imediatamente sem necessidade de criar tabelas no banco de dados para este jogo.

## 2. Desenvolvimento Local
1. Renomeie o arquivo `.env.example` para `.env`.
2. Cole sua URL e Chave do Supabase no `.env`:
   ```bash
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-longa
   ```
3. Execute `npm run dev`.

## 3. Deploy na Vercel
1. Suba este código para o GitHub.
2. Vá para a Vercel e clique em "Add New Project" -> Importe seu repositório.
3. Na seção "Environment Variables" (Variáveis de Ambiente) na tela de deploy da Vercel, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique em **Deploy**.

## Controles do Jogo
- **Movimentação**: Setas ou W/A/S/D.
- **Bomba**: Espaço.
- **Objetivo**: Explodir o oponente!
