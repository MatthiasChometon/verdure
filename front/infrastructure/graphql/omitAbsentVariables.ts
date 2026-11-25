const FORWARDED_VARIABLES = 'variables, requestHeaders:';
const OMIT_ABSENT_VARIABLES = '...(variables === undefined ? {} : { variables }), requestHeaders:';

// The generated SDK forwards `variables` as a possibly undefined optional parameter, which
// graphql-request's `RequestOptions` refuses under `exactOptionalPropertyTypes`; omitting
// the key sends the same request. Fails loudly if codegen changes its output.
export const omitAbsentVariables = (generated: string): string => {
  if (!generated.includes(FORWARDED_VARIABLES)) {
    throw new Error(`GraphQL SDK template changed: "${FORWARDED_VARIABLES}" not found`);
  }
  return generated.replaceAll(FORWARDED_VARIABLES, OMIT_ABSENT_VARIABLES);
};
