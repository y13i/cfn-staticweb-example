import "source-map-support/register";
import * as λ from "@y13i/apex.js";

import {S3} from "aws-sdk";
import axios from "axios";
import retryx from "retryx";
import {render} from "ejs";

export default λ(async (event, context) => {
  console.log(JSON.stringify({event, context}));

  const s3 = new S3();

  const customResourceResponseBase = {
    Reason:            `See the details in CloudWatch Logs: ${context.logGroupName} - ${context.logStreamName}`,
    StackId:           event.StackId,
    RequestId:         event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
  };

  let customResourceResponse: any;

  try {
    const templateBody = await (async () => {
      const getObjectResult = await retryx(() => s3.getObject({
        Bucket: event.ResourceProperties.TemplateBucket,
        Key:    event.ResourceProperties.TemplateKey,
      }).promise());

      return getObjectResult.Body!.toString();
    })();

    const templateVariables = {
      title: event.ResourceProperties.Title,
      body:  event.ResourceProperties.Body,
    };

    const renderedBody = render(templateBody, templateVariables);

    switch (event.RequestType) {
      case "Create": {
        await retryx(() => {
          return s3.putObject({
            Bucket:      event.ResourceProperties.Bucket,
            Key:         "index.html",
            Body:        renderedBody,
            ContentType: "text/html",
          }).promise();
        });

        const PhysicalResourceId = `s3://${event.ResourceProperties.Bucket}/index.html`;

        customResourceResponse = {
          ...customResourceResponseBase,
          PhysicalResourceId,

          Status: "SUCCESS",
          Data:   {Id: PhysicalResourceId},
        };
      } break;

      case "Update": {
        await retryx(() => {
          return s3.putObject({
            Bucket:      event.ResourceProperties.Bucket,
            Key:         "index.html",
            Body:        renderedBody,
            ContentType: "text/html",
          }).promise();
        });

        const PhysicalResourceId = `s3://${event.ResourceProperties.Bucket}/index.html`;

        customResourceResponse = {
          ...customResourceResponseBase,
          PhysicalResourceId,

          Status: "SUCCESS",
          Data:   {Id: PhysicalResourceId},
        };
      } break;

      case "Delete": {
        const PhysicalResourceId: string = event.PhysicalResourceId;

        await retryx(() => {
          return s3.deleteObject({
            Bucket: event.ResourceProperties.Bucket,
            Key:    "index.html",
          }).promise();
        });

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
