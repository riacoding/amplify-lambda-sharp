import { S3Event, S3Handler } from 'aws-lambda'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { appsyncAuthRequest } from './appsyncAuthRequest'
import { Readable } from 'stream'
import sharp from 'sharp'
import { createImage } from './graphql/mutations'
import { CreateImageMutationVariables, CreateImageMutation } from './graphql/API'

const s3 = new S3Client({ region: process.env.AWS_REGION })

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

export const handler: S3Handler = async (event: S3Event) => {
  console.log('Event:', JSON.stringify(event, null, 2))

  //TODO: FIX loop .... infinite loop as image uploaded and send to same bucket... disambiguate with folder resize or use another bucket

  try {
    const bucket = event.Records[0].s3.bucket.name
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '))

    //IF KEY INCLUDES RESIZED RETURN ** Stop Infinite loop **
    if (key.startsWith('resized/')) {
      console.log('Skipping resized image')
      return
    }

    const resizedKey = `resized/${key}`
    const getObjectParams = {
      Bucket: bucket,
      Key: key,
    }
    const getObjectCommand = new GetObjectCommand(getObjectParams)
    const originalImage = await s3.send(getObjectCommand)
    if (!originalImage.Body) {
      throw new Error('S3 getObject response does not contain a body.')
    }
    const imageBuffer = await streamToBuffer(originalImage.Body as Readable)
    const resizedImage = await sharp(imageBuffer)
      .resize(400, 400, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .toBuffer()
    const putObjectParams = {
      Bucket: bucket,
      Key: resizedKey,
      Body: resizedImage,
      ContentType: originalImage.ContentType,
    }
    const putObjectCommand = new PutObjectCommand(putObjectParams)
    await s3.send(putObjectCommand)
    console.log(`Successfully resized and uploaded image to ${resizedKey}`)

    //add image to DB via api
    const response = await appsyncAuthRequest({
      config: {
        region: process.env.REGION as string,
        url: process.env.APIENDPOINT as string,
      },
      operation: {
        operationName: 'CreateImage',
        query: createImage,
        variables: {
          input: {
            key: resizedKey,
          },
        } as CreateImageMutationVariables,
      },
    })

    const { data, errors } = response
    if (errors) {
      console.error('Error creating image:', errors)
      throw new Error(`Error creating image: ${errors[0].message}`)
    }

    const image = data as CreateImageMutation
    console.log('Image created:', image.createImage?.key)
  } catch (error: any) {
    console.error('Error processing S3 event:', error)
    throw new Error(`Error processing S3 event: ${error.message}`)
  }
}
