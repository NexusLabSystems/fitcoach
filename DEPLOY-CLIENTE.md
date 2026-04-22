# Guia: Deploy White-Label por Cliente (Branch Strategy)

Cada cliente recebe uma branch própria no mesmo repositório GitHub,
com logo e cores personalizadas, apontando para o mesmo Firebase.

---

## Conceito

```
repositório: pump-fit (GitHub)
│
├── branch: main              → seu app base (Pump Fit)
├── branch: cliente-joao      → versão do João Personal
└── branch: cliente-maria     → versão da Maria Personal
```

Cada branch vira um site separado no Netlify.
Os dados de todos os clientes ficam no mesmo Firebase — separados por conta de trainer.
Quando você corrige um bug na `main`, propaga para todos com um simples `merge`.

---

## Passo 1 — Criar a branch do cliente

Abra o terminal na pasta do projeto:

```bash
# Certifique-se de estar na main atualizada
git checkout main
git pull origin main

# Crie e entre na nova branch do cliente
git checkout -b cliente-joao
```

---

## Passo 2 — Personalizar o app para o cliente

### 2.1 Substituir a logo

Copie a logo do cliente (PNG, preferencialmente quadrada) para:
```
public/logo.png
```

### 2.2 Atualizar as cores — `tailwind.config.js`

Localize a seção `brand` e substitua pelas cores do cliente:

```js
brand: {
  50:  "#f0f9f6",
  100: "#d1f0e7",
  200: "#a3e1cf",
  300: "#66ccb0",
  400: "#33b391",
  500: "#1a9478",   // ← cor principal
  600: "#157a63",
  700: "#10604e",
  800: "#0c4a3c",
  900: "#08342a",
},
```

> Dica: use [uicolors.app](https://uicolors.app) para gerar a paleta a partir da cor principal do cliente.

### 2.3 Atualizar nome e theme-color — `index.html`

```html
<title>João Personal</title>
<meta name="theme-color" content="#1a9478" />
```

### 2.4 Atualizar manifest PWA — `vite.config.js`

Localize o bloco `manifest` dentro de `VitePWA({...})`:

```js
manifest: {
  name: "João Personal — Seu Treino",
  short_name: "João Personal",
  theme_color: "#1a9478",
  background_color: "#1a9478",
  // ...restante igual
}
```

---

## Passo 3 — Commit e push da branch

```bash
git add public/logo.png tailwind.config.js index.html vite.config.js

git commit -m "white-label: configuração para João Personal"

git push origin cliente-joao
```

---

## Passo 4 — Criar o site no Netlify

1. Acesse [app.netlify.com](https://app.netlify.com)
2. **"Add new site"** → **"Import an existing project"** → GitHub
3. Selecione o repositório `pump-fit`
4. Em **"Branch to deploy"** selecione `cliente-joao`
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. **"Deploy site"**

> As variáveis de ambiente do Firebase já estão configuradas no Netlify do projeto base.
> No novo site, vá em **Site configuration → Environment variables** e adicione as mesmas variáveis.

---

## Passo 5 — (Opcional) Domínio personalizado

Se o cliente tiver domínio próprio (ex: `app.joaopersonal.com.br`):

1. Netlify → **Domain management** → **Add a domain**
2. Siga as instruções para apontar o DNS

Sem domínio próprio, o Netlify gera uma URL gratuita como:
`https://joao-personal-app.netlify.app`

---

## Passo 6 — Criar a conta do trainer no app

Com o site no ar, acesse a URL e cadastre o personal trainer pelo fluxo normal do app.

---

## Como propagar correções de bugs para o cliente

```bash
git checkout cliente-joao
git merge main
git push origin cliente-joao
```

O Netlify detecta o push e faz novo deploy automaticamente.

---

## Checklist rápido

- [ ] Criar branch `cliente-nome` a partir da `main`
- [ ] Substituir `public/logo.png`
- [ ] Atualizar cores em `tailwind.config.js`
- [ ] Atualizar nome e theme-color em `index.html`
- [ ] Atualizar nome no manifest em `vite.config.js`
- [ ] Commit e push da branch
- [ ] Criar site no Netlify apontando para a branch
- [ ] Copiar variáveis de ambiente do Firebase no Netlify
- [ ] Fazer deploy e testar
- [ ] Configurar domínio personalizado (se houver)
- [ ] Criar conta do trainer no app
