import "source-map-support/register";
import * as λ from "@y13i/apex.js";

import {CloudFront} from "aws-sdk";
import axios from "axios";
import retryx from "retryx";

export default λ(async (event, context) => {
  console.log(JSON.stringify({event, context}));

  const cloudfront = new CloudFront();

  const customResourceResponseBase = {
    Reason:            `See the details in CloudWatch Logs: ${context.logGroupName} - ${context.logStreamName}`,
    StackId:           event.StackId,
    RequestId:         event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
  };

  let customResourceResponse: any;

  try {
    switch (event.RequestType) {
      case "Create": {
        const createResult = await retryx(() => {
          return cloudfront.createCloudFrontOriginAccessIdentity({
            CloudFrontOriginAccessIdentityConfig: event.ResourceProperties.CloudFrontOriginAccessIdentityConfig,
          }).promise();
        });

        const PhysicalResourceId = createResult!.CloudFrontOriginAccessIdentity!.Id!;

        customResourceResponse = {
          ...customResourceResponseBase,
          PhysicalResourceId,

          Status: "SUCCESS",
          Data:   {Id: PhysicalResourceId},
        };
      } break;

      case "Update": {
        const PhysicalResourceId: string = event.PhysicalResourceId;

        const getCloudFrontOriginAccessIdentityResult = await retryx(() => {
          return cloudfront.getCloudFrontOriginAccessIdentity({
            Id: PhysicalResourceId
          }).promise();
        });

        await retryx(() => cloudfront.updateCloudFrontOriginAccessIdentity({
          Id:      PhysicalResourceId,
          IfMatch: getCloudFrontOriginAccessIdentityResult.ETag,

          CloudFrontOriginAccessIdentityConfig: {
            CallerReference: getCloudFrontOriginAccessIdentityResult!.CloudFrontOriginAccessIdentity!.CloudFrontOriginAccessIdentityConfig!.CallerReference!,
            Comment:         event.ResourceProperties.CloudFrontOriginAccessIdentityConfig.Comment,
          },
        }).promise());

        customResourceResponse = {
          ...customResourceResponseBase,
          PhysicalResourceId,

          Status: "SUCCESS",
          Data:   {Id: PhysicalResourceId},
        };
      } break;

      case "Delete": {
        const PhysicalResourceId: string = event.PhysicalResourceId;

        const getCloudFrontOriginAccessIdentityResult = await retryx(() => {
          return cloudfront.getCloudFrontOriginAccessIdentity({
            Id: PhysicalResourceId
          }).promise();
        });

        await retryx(() => cloudfront.deleteCloudFrontOriginAccessIdentity({
          Id:      PhysicalResourceId,
          IfMatch: getCloudFrontOriginAccessIdentityResult.ETag,
        }).promise());

        customResourceResponse = {
          ...customResourceResponseBase,
          PhysicalResourceId,

          Status: "SUCCESS",
          Data:   {},
        };
      } break;

      default: {
        throw new Error("Unknown request type.");
      }
    }
  } catch (err) {
    customResourceResponse = {
      ...customResourceResponseBase,

      Status: "FAILED",
      Data:   {Error: err},
    };
  }

  console.log(JSON.stringify({customResourceResponse}));

  const customResourceResponsePutResult = await retryx(() => axios.put(
    event.ResponseURL,
    JSON.stringify(customResourceResponse),

    {
      headers: {
        "Content-Type": "",
      },
    }
  ));

  console.log(JSON.stringify({
    customResourceResponsePutResult: {
      status:     customResourceResponsePutResult.status,
      statusText: customResourceResponsePutResult.statusText,
      headers:    customResourceResponsePutResult.headers,
      data:       customResourceResponsePutResult.data,
    }
  }));

  return {
    customResourceResponse,
  };
});
