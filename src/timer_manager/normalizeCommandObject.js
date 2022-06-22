const { required, assertPlainObject, EPP } = require("../util");

module.exports = normalizeCommandObject;

/**
 * Normalizes command object parsed from command line arguments.
 * Example: `productivity-timer ct --name "coding" -d 20 -u "m"`
 * generates the object
 * `{ command: "ct", options: { name: ["coding"], d: ["20"], u: ["m"] }, arguments: [] }`
 * and this function turns this object into
 * `{ command: "CREATE", argument: { name: "coding", duration: 20, unit: "m" } }`
 * according to a given schema where "ct" is an alias for the command "CREATE"
 * and "u", "d" are aliases for the options "unit" and "duration" respectively.
 *
 * Finally the string "20" for duration is converted to the number 20 by a $exec
 * method defined in the schema of "duration" option.
 *
 * See all the command schemas in the commandSchema.js module.
 *
 * @param arg - {{commandAliases: object, allCommands: object, commandObject: object, allCommandSchemas: object}}
 * */
function normalizeCommandObject(arg) {
  const {
    commandAliases = required("aliases"),
    allCommands = required("allCommands"),
    commandObject = required("commandObject"),
    allCommandSchemas = required("commandSchema"),
  } = arg;

  assertValidCommandObject({ commandObject });

  let {
    command,
    options: commandOptions,
    arguments: commandArguments,
  } = commandObject;

  if (command in commandAliases) command = commandAliases[command];
  else if (allCommands.includes(command.toUpperCase()))
    command = command.toUpperCase();
  else throw new EPP(`Unknown command "${command}".`, "UNKNOWN_COMMAND");

  const {
    options: commandOptionsSchema,
    arguments: commandArgumentsSchema,
    optionAliases: commandOptionsAliases,
  } = allCommandSchemas[command];

  // work with options
  if (commandOptionsSchema && Object.keys(commandOptions).length)
    return buildCommandObjectWithCommandOptions({
      command,
      commandOptions,
      commandOptionsSchema,
      commandOptionsAliases,
    });

  if (commandArgumentsSchema)
    return buildCommandObjectWithMainArguments({
      command,
      commandArguments,
      commandArgumentsSchema,
    });

  return { command };
}

function buildCommandObjectWithCommandOptions({
  command,
  commandOptions,
  commandOptionsSchema,
  commandOptionsAliases,
}) {
  const normalizedCommandArgument = {};

  // substitute command option aliases with their respective options
  for (let [optionName, value] of Object.entries(commandOptions))
    if (optionName in commandOptionsAliases)
      normalizedCommandArgument[commandOptionsAliases[optionName]] = value;
    else normalizedCommandArgument[optionName] = value;

  for (const optionName of Object.keys(commandOptionsSchema)) {
    const optionValue = normalizedCommandArgument[optionName];
    const {
      $exec,
      type: optionValueType,
      default: defaultValue,
      optional: isOptionOptional,
    } = commandOptionsSchema[optionName];

    normalizedCommandArgument[optionName] =
      normalizeOptionAsCommandArgumentProperty({
        $exec,
        optionName,
        optionValue,
        defaultValue,
        optionValueType,
        normalizedCommandArgument,
        isOptionRequired: !isOptionOptional,
      });
  }

  return { command, argument: normalizedCommandArgument };

  function normalizeOptionAsCommandArgumentProperty({
    optionName,
    optionValue,
    defaultValue,
    optionValueType,
    isOptionRequired,
    $exec = (v) => v,
    normalizedCommandArgument,
  } = {}) {
    if (!(optionName in normalizedCommandArgument)) {
      if (defaultValue) return defaultValue;

      if (isOptionRequired)
        throw new EPP(`The property "${optionName}" is required.`);
    }

    if (optionValueType === "array") {
      if (!Array.isArray(optionValue))
        throw new EPP(`The value of "${optionName}" must be an array.`);
    } else {
      // e.g., if optionValueType is not an array then {name: ["coding"]} should
      // be normalized as {name: "coding"}
      if (Array.isArray(optionValue)) optionValue = optionValue[0];

      if (typeof optionValue !== optionValueType)
        throw new EPP(
          `The property "${optionName}" must be of type: "${optionValueType}"`
        );
    }

    return $exec(optionValue);
  }
}

function buildCommandObjectWithMainArguments({
  command,
  commandArguments,
  commandArgumentsSchema,
} = {}) {
  const { count: totalArgumentsCount, optional: optionalArgumentsCount = 0 } =
    commandArgumentsSchema;

  {
    const requiredArgumentsCount = totalArgumentsCount - optionalArgumentsCount;

    // e.g, the INFO command takes no argument(s)
    const isNoArgumentCommand = !requiredArgumentsCount & !commandArguments;
    if (isNoArgumentCommand) return { command };

    const isRequiredArgumentsMissing =
      !commandArguments || commandArguments.length < requiredArgumentsCount;

    if (isRequiredArgumentsMissing)
      throw new EPP({
        code: "MISSING_REQUIRED_MAIN_ARGUMENT(S)",
        message: `The command "${command}" is missing ${requiredArgumentsCount} required main argument(s).`,
      });
  }

  // in case there are excess number of arguments
  commandArguments = commandArguments.slice(0, totalArgumentsCount);

  if (!commandArguments.length) return { command };

  // e.g., if commandArguments is like: ["coding"] for the command: "START" then
  // the commandObject should be like: {command: "START", argument: "coding"}
  const argument =
    commandArguments.length === 1 ? commandArguments.pop() : commandArguments;

  return { command, argument };
}

function isArrayOfType({ array, type }) {
  for (const item of array) if (typeof item !== type) return false;
  return true;
}

function assertValidCommandObject({ commandObject } = {}) {
  assertPlainObject({
    object: commandObject,
    name: "commandObject",
    errorCode: "INVALID_COMMAND_OBJECT",
  });

  let {
    command,
    options: commandOptions,
    arguments: commandArguments,
  } = commandObject;

  {
    const isCommandOrOptionIsMissing =
      !("command" in commandObject) || !("options" in commandObject);

    if (isCommandOrOptionIsMissing)
      throw new EPP({
        code: "MISSING_PROPERTY",
        message: `The "command" or the "options" property is missing`,
      });
  }

  {
    const isCommandNonEmptyString =
      typeof command === "string" && command !== "";

    if (!isCommandNonEmptyString)
      throw new EPP({
        code: "INVALID_COMMAND",
        message: `The "command" property is missing or invalid.`,
      });
  }

  assertPlainObject({
    name: "options",
    object: commandOptions,
    errorCode: "INVALID_OPTIONS_OBJECT",
  });

  {
    const isCommandArgumentsAStringArray =
      Array.isArray(commandArguments) &&
      isArrayOfType({ array: commandArguments, type: "string" });

    if (commandArguments && !isCommandArgumentsAStringArray)
      throw new EPP({
        code: "INVALID_MAIN_ARGUMENTS",
        message: `The main arguments of a command must be an array of strings.`,
      });
  }
}
