import * as ServerCommands from "./commands/server";
import { Command } from "commander";
import { CLI_NAME } from "src/config/other";
import { addResetTimerCommand } from "./commands/timer/reset";
import { addTimerStartCommand } from "./commands/timer/start";
import { addEditProjectCommand } from "./commands/edit/project";
import { addProjectListCommand } from "./commands/list/projects";
import { addEditCategoryCommand } from "./commands/edit/category";
import { addCreateProjectCommand } from "./commands/create/project";
import { addDeleteProjectCommand } from "./commands/delete/project";
import { addCreateCategoryCommand } from "./commands/create/category";
import { addDeleteCategoryCommand } from "./commands/delete/category";
import { addListCategoriesCommand } from "./commands/list/categories";

const program = new Command();

program
  .name(CLI_NAME)
  .usage("<command> [args...]")
  .description("A CLI/TUI Pomodoro timer and Todo application.")
  .version(__APP_VERSION__, "-v, --version", "outputs the current version");

// Backend related
program
  .command("bootup")
  .description("Boots up the backend application.")
  .action(ServerCommands.bootup);
program
  .command("ping")
  .description("Pings the backend application.")
  .action(ServerCommands.ping);
program
  .command("quit")
  .description("Closes the backend application.")
  .action(ServerCommands.quit);

// Statistics
program.command("stats").description("Shows statistics.");

// project
const CreateCommand = program
  .command("create")
  .description("Creates a project/category");

addCreateCategoryCommand(CreateCommand);
addCreateProjectCommand(CreateCommand);

const EditCommand = program
  .command("edit")
  .description("Edits a project/category");

addEditProjectCommand(EditCommand);
addEditCategoryCommand(EditCommand);

const DeleteCommand = program
  .command("delete")
  .description("Deletes a project/category");
addDeleteProjectCommand(DeleteCommand);
addDeleteCategoryCommand(DeleteCommand);

const ListCommand = program
  .command("list")
  .description("Lists all projects/categories.");

addProjectListCommand(ListCommand);
addListCategoriesCommand(ListCommand);

program.command("pause").description("Pauses the currently running timer.");
program.command("end").description("End the currently running timer.");
program.command("info").description("Shows the timer information.");

program
  .command("set-duration")
  .description("Set the timer duration while the timer is not running.");

addResetTimerCommand(program);
addTimerStartCommand(program);

try {
  program.parse();
} catch (ex) {
  console.error(ex.message);
  process.exit(1);
}
