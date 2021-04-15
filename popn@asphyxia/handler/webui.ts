import { Profile, Scores } from "../models/common";

export const importPnmData = async (data: {
  refid: string;
  profile: string;
  scores: string;
}) => {
  const profile = JSON.parse(data.profile);
  const scores = JSON.parse(data.scores);

  await DB.Update<Profile>(
    data.refid,
    { collection: 'profile' },
    {
      $set: {
        ...profile
      }
    }
  );

  await DB.Upsert<Scores>(
    data.refid,
    { collection: 'scores' },
    {
      $set: {
        scores: {
          ...scores
        }
      }
    }
  );
};