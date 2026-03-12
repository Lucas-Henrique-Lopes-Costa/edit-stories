# Setup

## Pré-requisitos

- Node.js 18+
- Python 3.9+
- FFmpeg instalado no sistema (`brew install ffmpeg`)

## 1. Dependências Node.js

```bash
npm install
```

## 2. Banco de dados

```bash
npx prisma migrate dev
```

## 3. Dependências Python

```bash
cd python
pip install -r requirements.txt
```

Whisper usa PyTorch — na primeira execução vai baixar o modelo (~140MB para "base").

## 4. Variáveis de ambiente

Copie o `.env` e preencha:

```
DATABASE_URL="file:./prisma/dev.db"
ANTHROPIC_API_KEY="sua-chave-aqui"   # opcional — para nomes automáticos via Claude
```

## 5. Rodar

```bash
npm run dev
```

Acesse: http://localhost:3000

## Fases de implementação

| Fase | Status | Descrição |
|------|--------|-----------|
| 1 | ✅ Esqueleto | Upload, DB, rotas API |
| 2 | 🔜 | Transcrição Whisper + worker Python |
| 3 | 🔜 | Preview de legenda em tempo real |
| 4 | 🔜 | Exportação com FFmpeg + ASS |
| 5 | 🔜 | Geração de nome via Claude |
| 6 | 🔜 | Thumbnails + player avançado |
| 7 | 🔜 | Performance, fila de jobs, retry |
