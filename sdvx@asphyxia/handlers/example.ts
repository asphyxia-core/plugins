/*
EamusePluginRoute. Handle your game message like this

You can send a plain XML request to test this route:
<call model="NULL:example">
	<example method="method" card="E0040123456789AB"></example>
</call>
*/
export const example: EPR = async (info, data, send) => {
  /* [Check documentation for the entire API] */

  /*
    Access data from request like this
    NOTE: all card number will be automatically converted to refid.
    This is to support older game that doesn't use cardmng,
      yet still allow them to register with internal profile manager.
    And they can show up in WebUI as a profile, along with card binding feature.
   */
  const refid = $(data).attr().card;

  /* Access config like this */
  const event = U.GetConfig('event');

  /*
    Create user data in profile space if not exists
    WebUI will try to find a "name" field in profile documents and display them.
    If you are using a collection of data for each profile,
      make sure to avoid using name field in supplementary documents.
    If you have multiple documents per refid, it is recommended to provide a field to
      simulate collections in NoSQL database (e.g. MongoDB)
   */
  await DB.Upsert(
    refid,
    {
      collection: 'profile',
      name: 'ＰＬＡＹＥＲ',
    },
    { $inc: { login_count: 1 } }
  );

  /* 
    Send your response like this
    There are more methods for sending request.
   */
  send.pugFile('templates/example.pug', { refid, event });

  /* Or you can send ejs template (plain xml works as well) */
  // send.xmlFile('templates/example.xml', { refid, event });
};

export const changeName = async (data: any) => {
  await DB.Update(data.refid, { collection: 'profile' }, { $set: { name: data.name } });
};
