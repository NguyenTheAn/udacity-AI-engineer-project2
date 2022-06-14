// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

const { QnAMaker } = require('botbuilder-ai');
const DentistScheduler = require('./dentistscheduler');
const IntentRecognizer = require("./intentrecognizer")

class DentaBot extends ActivityHandler {
    constructor(configuration, qnaOptions) {
        // call the parent constructor
        super();
        if (!configuration) throw new Error('[QnaMakerBot]: Missing parameter. configuration is required');

        // create a QnAMaker connector
        this.QnAMaker = new QnAMaker(configuration.QnAConfiguration, qnaOptions)
       
        // create a DentistScheduler connector
        this.DentistScheduler = new DentistScheduler(configuration.SchedulerConfiguration);
      
        // create a IntentRecognizer connector
        this.IntentRecognizer = new IntentRecognizer(configuration.LuisConfiguration);


        this.onMessage(async (context, next) => {
            // send user input to QnA Maker and collect the response in a variable
            // don't forget to use the 'await' keyword
            const qnaReponse = await this.QnAMaker.getAnswers(context);
            const luisReponse = await this.IntentRecognizer.executeLuisQuery(context);
            // send user input to IntentRecognizer and collect the response in a variable
            // don't forget 'await'
            // const luisReponse = await this.IntentRecognizer.executeLuisQuery(context);
            // determine which service to respond with based on the results from LUIS //

            // if(top intent is intentA and confidence greater than 50){
            //  doSomething();
            //  await context.sendActivity();
            //  await next();
            //  return;
            // }
            // else {...}
            if (luisReponse.luisResult.prediction.topIntent === "ScheduleAppointment" && luisReponse.intents.ScheduleAppointment.score > 0.5){
                let time = luisReponse.entities.$instance.datetime[0].text;
                let setupAppointment = await this.DentistScheduler.scheduleAppointment(time);
                await context.sendActivity(setupAppointment);
                await next();
                return;
            }
            if (luisReponse.luisResult.prediction.topIntent === "GetAvailability" && luisReponse.intents.GetAvailability.score > 0.5) {
                let available = await this.DentistScheduler.getAvailability();
                await context.sendActivity(available);
                await next();
                return;
            }

            if (qnaReponse[0]) {
                await context.sendActivity(`${qnaReponse[0].answer}`);
            }
            else{
                await context.sendActivity("I don't know what are you talking about");
            }

            await next();
    });

        this.onMembersAdded(async (context, next) => {
        const membersAdded = context.activity.membersAdded;
        //write a custom greeting
        const welcomeText = 'Welcome!';
        for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
            if (membersAdded[cnt].id !== context.activity.recipient.id) {
                await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
            }
        }
        // by calling next() you ensure that the next BotHandler is run.
        await next();
    });
    }
}

module.exports.DentaBot = DentaBot;
