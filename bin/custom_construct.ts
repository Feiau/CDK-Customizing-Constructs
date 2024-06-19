#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { S3Stack } from '../lib/bucket';
import { ACRStack } from '../lib/aws-custom-resource';
import { CFNCRStack } from '../lib/cfn-custom-resource';
import { CRStack } from '../lib/custom-resource';

const app = new cdk.App();
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-west-2' }
const vpcStack = new VpcStack(app, 'VpcStack', {
  // env,
});

const s3Stack = new S3Stack(app, 'S3Stack', {
  // env,
})

new ACRStack(app, 'ACRStack', {
});

new CFNCRStack(app, 'CFNCRStack', {
});

new CRStack(app, 'CRStack', {
  message: 'CDK workshop: 19th June 2024'
});
