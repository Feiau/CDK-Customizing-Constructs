import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { IpAddresses } from 'aws-cdk-lib/aws-ec2';


// import * as sqs from 'aws-cdk-lib/aws-sqs';
declare const vpc: ec2.Vpc;

export class VpcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'TheVPC', {
      maxAzs: 2,
      natGateways: 0,
      enableDnsSupport: false
    });
    // const vpnConnection = vpc.addVpnConnection('Dynamic', {
    //   ip: '1.2.3.4'
    // });

    console.log('=====vpc=====')
    for (const child in vpc.node.findAll()) {
      const obj = vpc.node.findAll()[child].node.id
      console.log(obj)
    }

    // Find child "PublicSubnet1" first
    const L2PublicSubnet = vpc.node.findChild("PublicSubnet1")

    console.log('=====L2PublicSubnet=====')
    for (const child in L2PublicSubnet.node.findAll()) {
      const obj = L2PublicSubnet.node.findAll()[child].node.id
      console.log(obj)
    }
    // Find child L1 route of Public Subnet
    var L1Route = L2PublicSubnet.node.findChild("DefaultRoute") as ec2.CfnRoute

    L1Route.destinationCidrBlock = '1.0.0.0/0'
    L1Route.addOverride('Properties.DestinationCidrBlock', '2.0.0.0/0')
  }
}
