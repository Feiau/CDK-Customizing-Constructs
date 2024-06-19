import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

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

    const dummyCustomResource = new cdk.CfnCustomResource(this, 'DummyCustomResource', {
      serviceToken: helloWorldFunction.attrArn,
    });
  }
}
