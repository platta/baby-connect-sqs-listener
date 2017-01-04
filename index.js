
// Load required modules
var AWS = require('aws-sdk');
var winston = require('winston');
var nconf = require('nconf');
var async = require('async');
var babyConnect = require('baby-connect');

// Set up configuration
nconf
    .argv()
    .env()
    .file({
        file: './config.json'
    })
    .defaults({
        logLevel: 'error',
        queueWaitTimeSeconds: 20,
        degreeOfParallelism: 1
    });


// Apply logging configuration.
winston.level = nconf.get('logLevel');
winston.debug('Configured logging level.');


// Apply AWS SDK configuration.
if (!nconf.get('skipAwsCredentials')) {
    winston.debug('Updating AWS configuration.');
    AWS.config.update({
        accessKeyId: nconf.get('awsAccessKeyId'),
        secretAccessKey: nconf.get('awsSecretAccessKey'),
        region: nconf.get('awsRegion')
    });
    winston.debug('Updated AWS configuration.');
}


// Create an instance of SQS SDK.
winston.debug('Creating SQS instance.');
var sqs = new AWS.SQS();
winston.debug('Created SQS instance.');


// Create processing queue for received messages.
winston.debug('Creating processing queue.');
var receivedQueue = async.queue(queueCallback, nconf.get('degreeOfParallelism'));
winston.debug('Created processing queue.');


// Create the parameters object for receiveMessage calls.
var awsQueueUrl = nconf.get('queueUrl');
winston.debug('Preparing receiveMessage method parameters object.');
var receiveMessageParameters = {
    QueueUrl: awsQueueUrl,
    WaitTimeSeconds: nconf.get('queueWaitTimeSeconds')
};
winston.debug('Prepared receiveMessage method parameters object.');
winston.debug(JSON.stringify(receiveMessageParameters));


// Initialize baby-connect and start the main loop.
winston.debug('Initializing baby-connect module.');
babyConnect.initialize(nconf.get('babyConnectEmail'), nconf.get('babyConnectPassword'), function(error) {
    if (error) {
        winston.error(error);
        winston.info('Failed to initialize, exiting.');
    } else {

        // Start the chain reaction by calling receiveMessage
        winston.debug('Issuing initial receiveMessage call.');
        sqs.receiveMessage(receiveMessageParameters, receiveMessageCallback);
        winston.debug('Issued initial receiveMessage call.');

        winston.info('Initialization complete.');
    }
});

/**
 * Callback function that gets called every time the receiveMessage function
 * completes.
 * 
 * @param error
 *  An error, if one occurred, otherwise null.
 * 
 * @param data
 *  The response object from AWS for the receiveMessage call.
 */
function receiveMessageCallback(error, data) {
    if (error) {
        winston.error(error);
    } else {
        if (data && data.Messages && data.Messages.length > 0) {
            // Handle messages.
            winston.debug('Received %d message(s)', data.Messages.length);

            receivedQueue.push(data.Messages);
        } else {
            winston.debug('No messages received.');
        }

        // Execute another receive.
        sqs.receiveMessage(receiveMessageParameters, receiveMessageCallback);
    }
}


/**
 * Callback function to be called for each item in the queue of received
 * messages.
 * 
 * @param item
 *  A de-serialized object representing a single SQS message.
 * 
 * @param callback
 *  A callback function to invoke once the item has been processed.
 */
function queueCallback(item, callback) {
    // Process the message.
    winston.debug('Processing message with ID %s', item.MessageId);

    winston.debug(JSON.stringify(item));
    var payload;
    try {
        payload = JSON.parse(item.Body);
    } catch (error) {
        winston.error('Invalid message body:\n%s', item.Body);
        callback(error);
        return;
    }

    switch (payload.type) {
        case 'diaper':
            babyConnect.diaper(payload.parameters, function(error) {
                if (error) {
                    winston.error(error);
                } else {
                    winston.info('Successfully logged diaper.');
                }
                deleteMessage(item, callback);
            });
            break;

        case 'bottle':
            babyConnect.bottle(payload.parameters, function(error) {
                if (error) {
                    winston.error(error);
                } else {
                    winston.info('Successfully logged bottle.');
                }
                deleteMessage(item, callback);
            });
            break;
    }
}


/**
 * Deletes a message from the SQS message queue.
 * 
 * @param {Object} item
 *  An object from the SQS receiveMessage callback representing a single SQS
 *  message.
 * 
 * @param {function(Object): void} callback
 *  A callback function to invoke when finished.
 */
function deleteMessage(item, callback) {
    // Delete the message from the queue so we don't process it again.
    winston.debug('Deleting message %s from queue.', item.MessageId);
    sqs.deleteMessage({
        QueueUrl: awsQueueUrl,
        ReceiptHandle: item.ReceiptHandle
    }, function(error) {
        if (error) {
            callback(error);
        } else {
            winston.debug('Deleted message %s from queue.', item.MessageId);
            callback();
        }
    });
}