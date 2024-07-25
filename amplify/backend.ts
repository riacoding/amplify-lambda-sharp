import { defineBackend } from '@aws-amplify/backend'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { storage } from './storage/resource'
import { dynamoDBStream } from './functions/dynamoDBStream/resource'
import { StartingPosition } from 'aws-cdk-lib/aws-lambda'
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import * as defaults from '@aws-solutions-constructs/core'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { ArnFormat, Duration, Stack } from 'aws-cdk-lib'
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  dynamoDBStream,
})

const eventSource = new DynamoEventSource(backend.data.resources.tables['Image'], {
  startingPosition: StartingPosition.LATEST,
})

backend.dynamoDBStream.resources.lambda.addEventSource(eventSource)

const ihBucketARN = backend.storage.resources.bucket.bucketArn

//image Handler Stack
const iHStack = backend.createStack('imageHandler')

const APIENDPOINT = backend.data.resources.cfnResources.cfnGraphqlApi.attrGraphQlUrl
const APIARN = backend.data.resources.cfnResources.cfnGraphqlApi.attrGraphQlEndpointArn

const imageHandlerLambdaFunctionRole = new Role(iHStack, 'ImageHandlerFunctionRole', {
  assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
  path: '/',
})

const imageHandlerLambdaFunctionRolePolicy = new Policy(iHStack, 'ImageHandlerFunctionPolicy', {
  statements: [
    new PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [
        Stack.of(iHStack).formatArn({
          service: 'logs',
          resource: 'log-group',
          resourceName: '/aws/lambda/*',
          arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        }),
      ],
    }),
    new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`${ihBucketARN}/*`],
    }),
    new PolicyStatement({
      actions: ['s3:ListBucket'],
      resources: [`${ihBucketARN}/*`],
    }),
    new PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [`${ihBucketARN}/*`],
    }),
  ],
})

imageHandlerLambdaFunctionRole.attachInlinePolicy(imageHandlerLambdaFunctionRolePolicy)

const lambdaAppDir = path.resolve(__dirname, './image-handler')

const imageHandlerLambdaFunction = new NodejsFunction(iHStack, 'ImageHandlerLambdaFunction', {
  description: `Performs image edit`,
  memorySize: 1024,
  runtime: Runtime.NODEJS_20_X,
  timeout: Duration.seconds(29),
  role: imageHandlerLambdaFunctionRole,
  projectRoot: lambdaAppDir,
  entry: path.join(lambdaAppDir, 'index.ts'),
  depsLockFilePath: path.join(lambdaAppDir, 'package-lock.json'),
  environment: {
    APIENDPOINT: APIENDPOINT,
    REGION: Stack.of(iHStack).region,
  },
  bundling: {
    externalModules: ['sharp'],
    nodeModules: ['sharp'],
    forceDockerBundling: true,
  },
})

backend.data.resources.graphqlApi.grantMutation(imageHandlerLambdaFunction)

const existingBucket = s3.Bucket.fromBucketArn(iHStack, 'ExistingBucket', ihBucketARN)

imageHandlerLambdaFunction.addEventSource(new S3EventSource(existingBucket as s3.Bucket, defaults.S3EventSourceProps()))

const imageHandlerLogGroup = new LogGroup(iHStack, 'ImageHandlerLogGroup', {
  logGroupName: `/aws/lambda/${imageHandlerLambdaFunction.functionName}`,
  retention: RetentionDays.ONE_WEEK,
})
