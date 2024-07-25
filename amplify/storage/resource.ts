import { defineStorage } from '@aws-amplify/backend'
import { dynamoDBStream } from '../functions/dynamoDBStream/resource'

export const storage = defineStorage({
  name: 'sharpDemo',
  access: (allow) => ({
    'resized/*': [
      allow.guest.to(['read', 'write']),
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.resource(dynamoDBStream).to(['read', 'delete']),
    ],
    'public/*': [allow.guest.to(['read', 'write']), allow.resource(dynamoDBStream).to(['read', 'delete'])],
  }),
})
