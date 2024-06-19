# Topics
1. Referencing resources
   - Referencing resources in a different stack
     - Demo
     - Dependency deadlocks
   - Referencing resources in your AWS account
     - Workaround: SSM parameter 
     - ACM demo

2. Nested Stack (Cross references between parent stack and nested stack)
3. Customizing constructs                                                  <<<<<<
   - Abstraction
   - Using escape hatches
   - Un-escape hatches
   - Raw overrides
   - Custom resources

## Customizing constructs
Reference: https://github.com/Daniel-ZA/CDK-Abstractions-EscapeHatches/blob/main/README.md
### Abstraction
Abstraction is used to hide background details or any unnecessary implementation about the data so that users only see the required information. In CDK, the VPC construct is a high level abstraction. You just need to know which methods of the object are available to call and which input parameters are needed to trigger a specific operation. But you don’t need to understand how this method is implemented and which kinds of actions it has to perform to create the expected result. 

For example, you can just call `vpc.addVpnConnection` with an IP address to add connection with one gateway, but you have no idea there are five resources are created in CFN side. 

```typescript
const vpnConnection = vpc.addVpnConnection('Dynamic', {
 ip: '1.2.3.4'
});

[+] AWS::EC2::CustomerGateway 
[+] AWS::EC2::VPNConnection 
[+] AWS::EC2::VPNGateway 
[+] AWS::EC2::VPCGatewayAttachment 
[+] AWS::EC2::VPNGatewayRoutePropagation 
```

### Levels of Abstraction
* Level 1 (CloudFormation resource types)
  * Directly represent AWS CloudFormation resources
  * These constructs can be identified via a name beginning with "Cfn," so they are also referred to as "Cfn constructs." 

> Example using [CfnVPC](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ec2.CfnVPC.html) construct. Equivalent to [AWS::EC2::VPC](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-vpc.html) resource type.
```typescript
const vpc = new ec2.CfnVPC(this, 'TheVPC', {
  cidrBlock: '10.0.0.0/16',
  enableDnsHostnames: true
})
```
* Level 2   
  * Define additional supporting resources, such as IAM policies, Amazon SNS topics, or AWS KMS keys. 
  * Provide sensible defaults, best practice security policies, and ergonomic.

> Example using [PublicSubnet](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ec2.PublicSubnet.html) construct:

```typescript
const publicSubnet = new ec2.PublicSubnet(this, 'MyPublicSubnet', {
  availabilityZone: 'us-east-1a',
  cidrBlock: '10.0.0.0/24',
  vpcId: 'vpc-0623fb81d9e354694',
});

PublicSubnet1
Subnet
Acl
RouteTable
RouteTableAssociation
DefaultRoute
```

* Level 3 
  * Define entire collections of AWS resources or an architecture for us.
  * Help to stand up a build pipeline, an Amazon ECS application, or one of many other types of common deployment scenarios.
  * They are built around a particular approach toward solving the problem.
```typescript
const vpc = new ec2.Vpc(this, 'TheVPC', {
  ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
  availabilityZones: ["us-east-1a"]
})
```

### Why customizing constructs
No abstraction is perfect, and even good abstractions cannot cover every possible use case. During development, you may find a construct that almost fits your needs, requiring a small or large customization. For this reason, the AWS CDK provides ways to break out of the construct model. 

### Develop escape hatches for L1 constructs
In rare cases, you want to define a resource that doesn't have a corresponding CfnXxx class. This could be a new resource type. In cases like this, you can instantiate the cdk.CfnResource directly and specify the resource type and properties. 
```typescript
new cdk.CfnResource(this, 'MyBucket', {
  type: 'AWS::S3::Bucket',
  properties: {
    // Note the PascalCase here! These are CloudFormation identifiers.
    AnalyticsConfigurations: [
      {
        Id: 'Config',
        // ...
      }
    ] 
  }
});
```

### Develop escape hatches for L2/L3 constructs
If an L2 construct is missing a feature or you're trying to work around an issue, you can modify the L1 construct that's encapsulated by the L2 construct.

The basic approach to get access to the L1 construct is to use construct.node.defaultChild (Python: default_child), cast it to the right type (if necessary), and modify its properties. 

let's take the examples of Bucket and VPC constructs.

- Bucket construct example: 
There is a property called `AnalyticsConfigurations` in `AWS::S3::Bucket` resource definiton, but no way to directly touch this property in L2 Bucket construct. 

```typescript
// Node represents the construct node in the scope tree. The `defaultChild` method returns the child construct
const CfnBucket = myBucket.node.defaultChild as bucket.CfnBucket 

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
```
- VPC construct example:
Use case: I want to modify the CIDR block for a route in a public subnet, how can I do that?

```typescript
    // Find child "PublicSubnet1" first
    const L2PublicSubnet = vpc.node.findChild("PublicSubnet1")

    // Find child L1 route of Public Subnet
    var L1Route = L2PublicSubnet.node.findChild("DefaultRoute") as ec2.CfnRoute

    L1Route.destinationCidrBlock = '1.0.0.0/0'
```

> L3 VPC -> L2 PublicSubnet -> L1 [CfnRoute](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ec2.CfnRoute.html) OR [AWS::EC2::Route](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-route.html
)

### Un-escape hatches
* Provides the capability to go up an abstraction level.
* Helpful when you want to use convenience methods like [.enableEventBridgeNotification()](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html#enablewbreventwbrbridgewbrnotification) that aren't available on the L1 construct.

```typescript
const CfnBucket = new s3.CfnBucket(this, 'MyBucket', {})

const l2Bucket = s3.Bucket.fromCfnBucket(CfnBucket)

l2Bucket.enableEventBridgeNotification()
```

### Raw overrides
If there are properties that are missing from the L1 construct, you can bypass all typing using raw overrides. This also makes it possible to delete synthesized properties.

> Using previous example of modifying L1 Route

```typescript
    L1Route.addPropertyOverride('DestinationCidrBlock', '2.0.0.0/0')
    OR
    L1Route.addOverride('Properties.DestinationCidrBlock', '2.0.0.0/0')

    // Delete Route
    L1Route.addPropertyDeletionOverride('DestinationCidrBlock')

    // Other Sample 
    const cfnBucket = bucket.node.defaultChild as s3.CfnBucket;
    cfnBucket.addPropertyOverride('VersioningConfiguration.Status', 'Suspended');
    cfnBucket.addPropertyDeletionOverride('VersioningConfiguration.Status');
    cfnBucket.addPropertyOverride('Tags.0.Value', 'NewValue');
    cfnBucket.addPropertyDeletionOverride('Tags.0');
```

### Custom resources
In some scenarios, the feature you want isn't available through AWS CloudFormation, but only through a direct API call. You can develop Custom Resources. 

Building a custom resource involves writing a Lambda function that responds to a resource's CREATE, UPDATE, and DELETE lifecycle events. If your custom resource needs to make only a single API call, consider using the AwsCustomResource. 

The subject is too broad to cover completely here, but the following links should get you started:
[Custom Resources](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html) and [Custom-Resource Example](https://github.com/aws-samples/aws-cdk-examples/tree/main/typescript/custom-resource).

- AwsCustomResource;
Use this to bridge any gap that might exist in the CloudFormation Coverage. You can specify exactly which calls are invoked for the 'CREATE', 'UPDATE' and 'DELETE' lifecycle events.

```typescript
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
```

- CfnCustomResource with `zipFile`;
```typescript
export class CFNCRStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Resources
    const lambdaExecutionRole = new iam.CfnRole(this, 'LambdaExecutionRole', {
      assumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      },
      managedPolicyArns: [
        'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      ],
    });

    const helloWorldFunction = new lambda.CfnFunction(this, 'HelloWorldFunction', {
      role: lambdaExecutionRole.attrArn,
      code: {
        zipFile: 'import os\nimport cfnresponse\ndef lambda_handler(event, context):\n  physical_id = \'TheOnlyCustomResource\'\n  try:\n    function_response = os.getenv(\'FUNCTION_RESPONSE\')\n    responseData = {\'Response\': function_response}\n    cfnresponse.send(event, context,cfnresponse.SUCCESS, responseData, physical_id)\n  except Exception as Effect:\n    cfnresponse.send(event, context,cfnresponse.FAILED, {}, physical_id)\n',
      },
      handler: 'index.lambda_handler',
      runtime: 'python3.11',
      environment: {
        variables: {
          'FUNCTION_RESPONSE': 'Hello World',
        },
      },
    });

    const dummyCustomResource = new cdk.CustomResource(this, 'DummyCustomResource', {
      serviceToken: helloWorldFunction.attrArn,
    });
  }
}
```

- CustomResource with `lambda.Code.fromAsset` and `Provider` framework;
```typescript
export interface MyCustomResourceProps {
  message: string;
}

export class CRStack extends cdk.Stack {
  public readonly response: string;
  constructor(scope: Construct, id: string, props: MyCustomResourceProps) {
    super(scope, id);

    const fn = new lambda.SingletonFunction(this, 'Singleton', {
      uuid: 'f7d4f730-4ee1-11e8-9c2d-fa7ae01bbebc',
      code: lambda.Code.fromAsset('./custom-resource-handler.zip'),
      handler: 'custom-resource-handler.main',
      timeout: cdk.Duration.seconds(300),
      runtime: lambda.Runtime.PYTHON_3_9,
    });

    const provider = new cr.Provider(this, 'Provider', {
      onEventHandler: fn,
    });

    const resource = new cdk.CustomResource(this, 'Resource', {
      serviceToken: provider.serviceToken,
      properties: props,
    });

    this.response = resource.getAttString('Response');
    new cdk.CfnOutput(this, 'Message', { value: JSON.stringify(this.response) });
  }
}
```
### Provider
Differ from CloudFormation there are only two service provider, SNS and Lambda, from CDK programing perspective there are 4 different providers. The additional two are [CustomResourceProvider](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CustomResourceProvider.html) and [Provider](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.custom_resources.Provider.html).

The Provider mini-framework offers a high-level API which makes it easier to implement robust and powerful custom resources and includes the following capabilities:

- Handles responses to AWS CloudFormation and protects against blocked deployments
- Validates handler return values to help with correct handler implementation
- Supports asynchronous handlers to enable operations that require a long waiting period for a resource, which can exceed the AWS Lambda timeout
- Implements default behavior for physical resource IDs.




