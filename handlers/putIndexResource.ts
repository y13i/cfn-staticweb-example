import "source-map-support/register";
import * as λ from "@y13i/apex.js";

export default λ(async (event, context) => {
  console.log({event, context});

  return {
    message: "hello",
  };
});
