import type { DynamoDBStreamHandler } from 'aws-lambda'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Logger } from '@aws-lambda-powertools/logger'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { AttributeValue } from '@aws-sdk/client-dynamodb'
import { Image } from './graphql/API'
import { env } from '$amplify/env/dynamoDBStream'

const logger = new Logger({
  logLevel: 'INFO',
  serviceName: 'dynamodb-stream-handler',
})

export const handler: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    logger.info(`Processing record: ${record.eventID}`)
    logger.info(`Event Type: ${record.eventName}`)

    if (record.eventName === 'REMOVE' && record.dynamodb?.OldImage) {
      // business logic to process new records
      const rec = record.dynamodb
      const keys = rec?.Keys
      if (record.dynamodb?.OldImage) {
        const deletedItem = unmarshall(record.dynamodb.OldImage as Record<string, AttributeValue>) as Image
        logger.info(`Old Image: ${JSON.stringify(record.dynamodb?.OldImage)}`)

        await deleteObject(env.SHARP_DEMO_BUCKET_NAME, deletedItem.key)
      }
    }
  }
  logger.info(`Successfully processed ${event.Records.length} records.`)

  return {
    batchItemFailures: [],
  }
}

async function deleteObject(bucket: string, key: string) {
  const client = new S3Client()
  const input = {
    // DeleteObjectRequest
    Bucket: bucket, // required
    Key: key, // required
  }
  try {
    const command = new DeleteObjectCommand(input)
    const response = await client.send(command)
    logger.info(`Deleted Image: ${key} from bucket ${bucket}`)
  } catch (err) {
    logger.error(`Image ${key} was not deleted from ${bucket}`)
  }
}
