import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';

export class GitHubOidcStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubProvider = new iam.OpenIdConnectProvider(this, 'GitHubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    const githubRole = new iam.Role(this, 'GitHubActionsRole', {
      assumedBy: new iam.WebIdentityPrincipal(githubProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': 'repo:copperlang2007/optiframe:*',
        },
      }),
      description: 'OptiFrame GitHub OIDC deploy role - least privilege',
      maxSessionDuration: cdk.Duration.hours(1),
    });

    githubRole.addToPolicy(new iam.PolicyStatement({
      sid: 'S3Assets',
      actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket', 's3:DeleteObject'],
      resources: [
        'arn:aws:s3:::optiframe-*/*',
        'arn:aws:s3:::optiframe-*',
      ],
    }));

    githubRole.addToPolicy(new iam.PolicyStatement({
      sid: 'CloudFront',
      actions: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'],
      resources: ['*'],
    }));

    githubRole.addToPolicy(new iam.PolicyStatement({
      sid: 'Lambda',
      actions: [
        'lambda:UpdateFunctionCode',
        'lambda:UpdateFunctionConfiguration',
        'lambda:InvokeFunction',
        'lambda:GetFunction',
      ],
      resources: ['arn:aws:lambda:*:*:function:optiframe-*'],
    }));

    githubRole.addToPolicy(new iam.PolicyStatement({
      sid: 'DynamoDB',
      actions: [
        'dynamodb:PutItem',
        'dynamodb:GetItem',
        'dynamodb:Query',
        'dynamodb:Scan',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
      ],
      resources: ['arn:aws:dynamodb:*:*:table/optiframe-*'],
    }));

    githubRole.addToPolicy(new iam.PolicyStatement({
      sid: 'SecretsManager',
      actions: ['secretsmanager:GetSecretValue'],
      resources: ['arn:aws:secretsmanager:*:*:secret:optiframe/*'],
    }));

    new cdk.CfnOutput(this, 'GitHubRoleArn', {
      value: githubRole.roleArn,
      description: 'ARN for GitHub OIDC role - use in workflow',
    });
  }
}