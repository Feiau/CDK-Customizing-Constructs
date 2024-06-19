import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3'


export class S3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const myBucket = new s3.Bucket(this, 'Bucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,            // Default is Retain;
    });
    console.log('=====s3.Bucket=====')
    for (const child in myBucket.node.findAll()) {
      const obj = myBucket.node.findAll()[child].node.id
      console.log(obj)
    }

    const CfnBucket = myBucket.node.defaultChild as s3.CfnBucket

    console.log('=====CfnBucket=====')
    for (const child in CfnBucket.node.findAll()) {
      const obj = CfnBucket.node.findAll()[child].node.id
      console.log(obj)
    }

    CfnBucket.analyticsConfigurations = [
      {
        id: 'Config',
        storageClassAnalysis: {
          dataExport: {
            destination: {
              bucketArn: 'arn:aws:s3:::fei-1',
              format: 'CSV',
            },
            outputSchemaVersion: 'V_1',
          },
        },
      }
    ]

    CfnBucket.addPropertyOverride('VersioningConfiguration.Status', 'Suspended');
  }
}
