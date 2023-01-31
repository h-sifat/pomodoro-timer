import type { Command } from "commander";
import { withClient } from "cli/util/client";
import { TimerService } from "client/services/timer";
import { printTimerMethodCallResult } from "cli/util/timer";
import { API_AND_SERVER_CONFIG as config } from "src/config/other";

export function addTimerInfoCommand(program: Command) {
  program
    .command("info")
    .description("Shows the countdown timer information.")
    .action(showTimerInfo);
}

async function showTimerInfo() {
  await withClient(async (client) => {
    const timerService = new TimerService({
      client,
      url: config.API_TIMER_PATH,
    });

    const data = await timerService.getInfo();

    const { state, duration, ref = null, elapsedTime, remainingTime } = data;
    printTimerMethodCallResult({
      ref,
      state,
      timeInfo: { elapsedTime, duration, remainingTime },
    });
  });
}
