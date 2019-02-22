// Imports the Google Cloud client library
const Datastore = require('@google-cloud/datastore');

// Your Google Cloud Platform project ID
const projectId = 'alfred-g';

// Instantiates a client ** Google Cloud use **
//const datastore = Datastore({ projectId: projectId });
//** Other than Google Cloud, include keyfile **
const datastore = Datastore({ projectId: projectId, keyFilename: 'googlekey.json' });

async function createEntry()
{

    try
    {
        for (var i = 0; i < 10; i++)
        {
            // The kind/table
            const test_kind = 'test_kind';

            // The ID for the new entity
            const test_id = 'test-' + i;


            // The Cloud Datastore key for the new entity
            const  test_key = datastore.key([test_kind, test_id]);

            //the Actual Object to save..
            var test_entity = {
                test_id: test_id,
                first_name: 'Foo',
                last_name: 'Bar',
                email: 'foo@bar.com',
                created: Date.now(),
            };

            // Prepares the new entity
            const test_entry = {
                key: test_key,
                data: test_entity
            };

            var start_time = Date.now();
            // Saves the entity (new = insert, existing = update)
            await datastore.save(test_entry);
            var end_time = Date.now();

            var duration = end_time - start_time;

            console.log('Duration: ' + duration + 'ms');
        }

    }
    catch(err)
    {
        console.log(err);
    }
}

createEntry();