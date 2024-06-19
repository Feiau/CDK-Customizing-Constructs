import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cr from 'aws-cdk-lib/custom-resources';

// resources: ['arn:aws:servicecatalog:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:product/${productId}'],

export class ACRStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const listArtifacts = new cr.AwsCustomResource(this, 'ListArtifacts', {
            onUpdate: { // will also be called for a CREATE event
                service: 'ServiceCatalog',
                action: 'listProvisioningArtifacts',
                parameters: {
                    ProductId: 'prod-7guxqoeosspzm',
                },
                physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()), // Update physical id to run the SDK call in every deployment.
            },
            policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
                resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
            }),
        });
        const versionID = listArtifacts.getResponseField('ProvisioningArtifactDetails.0.Id');

        new cdk.CfnOutput(this, 'VersionID', { value: JSON.stringify(versionID) });
    }
}


