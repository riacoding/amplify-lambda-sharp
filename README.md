
# Getting Started

First, deploy the sandbox:

```bash
npx ampx sandbox
```

Then deploy the dev server:

```bash
npm run dev
```

## Project details

- Amplify Gen 2
- Nextjs 14 App router
- Lambda with Sharp in a seperate stack bundled with docker. Will need docker installed locally
- DynamoDB Stream to Lambda for Image removal from bucket
