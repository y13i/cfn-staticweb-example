const fs = require("fs");

const templateStr = fs.readFileSync(".serverless/cloudformation-template-update-stack.json");

const template = JSON.parse(templateStr);

delete template.Resources.ServerlessDeploymentBucket;
delete template.Outputs.ServerlessDeploymentBucketName;

template.Description = "CloudFormation static website example.";
template.Resources.CfnOaiLambdaFunction.Properties.Code.S3Bucket = "cfn-staticweb-example";
template.Resources.CfnOaiLambdaFunction.Properties.Code.S3Key = "functions.zip";
template.Resources.PutIndexObjectLambdaFunction.Properties.Code.S3Bucket = "cfn-staticweb-example";
template.Resources.PutIndexObjectLambdaFunction.Properties.Code.S3Key = "functions.zip";

fs.writeFileSync(".serverless/cfn.json", JSON.stringify(template, undefined, 2));
