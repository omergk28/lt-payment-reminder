/**
 * CONFIG
 */
// Speadsheet Configuration
const paymentForColumn = 0;
const dueDayOfMonthColumn = 1;
const currentBalanceColumn = 2;
const amountColumn = 3;
const paymentUrlColumn = 4;

const startRow = 2;  // skip header row
const numberOfColumns = 5; // Columns A, B, C, D, E

// Reminder Configuration
const remindWithinDays = 3;
const sheetName = "NAME_OF_YOUR_SPREADSHEET";
const emailAddress = "EMAIL_ADDRESS_FOR_REMINDERS";
const emailSubject = 'Payment Reminder';
const emailReminderPerPayment = true; // get a single notification with multiple due dates if false
/**
 * END CONFIG
 */

function createDailyTrigger() {
  let timezone = Session.getScriptTimeZone();

  // Create a new trigger that runs the `reminderRun` function daily at 6am
  ScriptApp.newTrigger("reminderRun")
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .inTimezone(timezone)
    .create();
}

function reminderRun() {
  scanSheetAndSendEmailReminder(false, emailReminderPerPayment);
}

// use for development
function dryRun() {
  scanSheetAndSendEmailReminder(true, emailReminderPerPayment);
}

function scanSheetAndSendEmailReminder(doNotSendMail, reminderPerLine) {
  let today = new Date();
  let sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const numRows = sheet.getLastRow() - 2;   // exclude total row

  let dataRange = sheet.getRange(startRow, 1, numRows, numberOfColumns)
  let data = dataRange.getValues();

  let emailMessage = "";

  for (i in data) {
    let row = data[i];
    let dueDayOfMonth = row[dueDayOfMonthColumn];
    let amountDue = determineAmountDue(row);

    if (isPaymentDue(today, dueDayOfMonth, amountDue)) {
      let message = generateMessageForRow(row);
      emailMessage += message + "\n\n";
      if (doNotSendMail) {
        console.log(message);
        continue;
      }
      if (reminderPerLine) {
        MailApp.sendEmail(emailAddress, emailSubject, message);
      }
    }
  }

  if (!reminderPerLine && !doNotSendMail) {
    MailApp.sendEmail(emailAddress, emailSubject, emailMessage);
  }
}

function generateMessageForRow(row) {
  let formattedAmount = Utilities.formatString('$' + "%0.2f", row[amountColumn]);
  let dueOn = appendSuffix(row[dueDayOfMonthColumn]);
  let paymentFor = row[paymentForColumn];
  let url = row[paymentUrlColumn];

  let message = 'Reminder: ' + formattedAmount + ' payment due on ' + dueOn + ' for ' + paymentFor + '\n';
  if (url != "") {
    message += 'Click ' + url + ' to make payment.';
  }
  return message;
}

function isPaymentDue(today, dueDayOfMonth, amountDue) {
  if (amountDue <= 0) {
    return false;
  }
  let { diffThisMonth ,diffNextMonth} = getDeltasForComparison(today, dueDayOfMonth);

  if (diffThisMonth >= 0 && diffThisMonth <= remindWithinDays) {
    return true;
  }

  if (diffNextMonth >= 0 && diffNextMonth <= remindWithinDays) {
    return true;
  }

  return false;
}

function getDeltasForComparison(today, dueDayOfMonth) {
  let year = today.getFullYear();
  let month = today.getMonth();
  let nextMonth = month + 1;
  let nextYear = year;

  if (nextMonth === 13) {
    nextMonth = 1;
    nextYear = year + 1;
  }

  let dueThisMonth = new Date(year, month, dueDayOfMonth);
  let dueNextMonth = new Date(nextYear, nextMonth, dueDayOfMonth);

  let diffThisMonth = getDaysBetween(today, dueThisMonth);
  let diffNextMonth = getDaysBetween(today, dueNextMonth);

  return {diffThisMonth, diffNextMonth};
}

function getDaysBetween(date1, date2) {
  let timeDifferenceMs = date2 - date1;
  let timeDifferenceDays = timeDifferenceMs / (24 * 60 * 60 * 1000);
  timeDifferenceDays = Math.round(timeDifferenceDays);
  return timeDifferenceDays;
}

function determineAmountDue(row) {
  let amountDue = row[currentBalanceColumn];

  if (amountDue == "R") { // Recurring payments
    return row[amountColumn];
  } else if (amountDue == "A") { // AutoPay (no reminder needed)
    return 0;
  } else {
    return amountDue;
  }
}

function appendSuffix(number) {
  let suffix = '';
  if (number % 10 == 1 && number != 11) {
    suffix = 'st';
  } else if (number % 10 == 2 && number != 12) {
    suffix = 'nd';
  } else if (number % 10 == 3 && number != 13) {
    suffix = 'rd';
  } else {
    suffix = 'th';
  }
  return number + suffix;
}
