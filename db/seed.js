const uuid = require('uuid');
const PageRepository = require('../app/repositories/page_repository.js');
const { currentTimeMs, calculateAge } = require('../app/utils.js');
const environment = process.env.ENVIRONMENT || 'development'
const config = require('../knexfile.js')[environment];
const knex = require('knex')(config);

const password = '$2b$10$PP8qMh/3uVjqpF46Z9d71eDMxWj6WkAAt4kvze6fA1VFSWP1JmOfG'; // 1234
const cityId = 'd81b72fd-8520-4403-aba3-17e1eddfc20f'; // Sofia

const randomNumberBetween = (end) => Math.floor(Math.random() * end);

const generateVerificationStatus = () => {
  return ['verified', 'pending', 'rejected'][randomNumberBetween(3)];
};

const dateItem = (n) => n < 10 ? `0${n}` : n;

const buildUser = (i, gender, offset = 0) => {
  const ti = i + 1 + offset;
  const name = 'male' === gender ? `MaleNa_${i + 1}` : `FemaleNa_${i + 1}`;
  const email = `mx1${ti}@mail.com`;
  const birthday = `${1980 + randomNumberBetween(16)}/${dateItem(1 + randomNumberBetween(11))}/${dateItem(1 + randomNumberBetween(27))}`;
  const verificationStatus = generateVerificationStatus();
  const verified = 'verified' === verificationStatus;
  const createdAt = currentTimeMs() + ti; // It'll be the same time otherwise for all seeds.

  return {
    id: uuid.v4(),
    name,
    email,
    password,
    birthday,
    age: calculateAge(new Date(birthday)),
    gender,
    interested_in: 'male' === gender ? 'female': 'male',
    city_id: cityId,
    user_status: 'active',
    verification_status: verificationStatus,
    verified,
    created_at: createdAt
  };
};

const compatibilityInfo = ({ id, gender, interested_in }) => ({ id, gender, interested_in });

addUsers = async () => {
  const users = [];

  for (let i = 0; i < 200; i++) {
    const user = buildUser(i, 'male');
    await knex('users').insert(user);

    users.push(user);
  }

  for (let i = 0; i < 200; i++) {
    const user = buildUser(i, 'female', 200);
    await knex('users').insert(user);

    users.push(user);
  }

  return users;
};

setUsersCompatibility = async (users) => {
  const compatibilities = [];

  const hasEntry = (id1, id2) =>
    compatibilities.find(
      ({ user_one_id, user_two_id }) => (user_one_id === id1 && user_two_id === id2) || (user_one_id === id2 && user_two_id === id1)
    );

  users.forEach(user => {
    possibleCompatibilities = users.filter(uItem => uItem.gender === user.interested_in && user.gender === uItem.interested_in && uItem.id !== user.id);
    possibleCompatibilities.forEach(item => {
      if (hasEntry(user.id, item.id)) return;

      compatibilities.push({ user_one_id: i.id, user_two_id: item.id });
    });
  });

  for (({ user_one_id, user_two_id }) of compatibilities) {
    const percent = randomNumberBetween(101); // random number between 0 and 100 (including 0 and 100)

    await knex('user_compatability').insert({ user_one_id, user_two_id, percent });
  };
};

const setUsersSearchPreferences = async (userIds) => {
  for (const userId of userIds) {
    await knex('search_preferences').insert({
      user_id: userId,
      from_age: 18,
      to_age: 40,
      city_id: cityId,
      created_at: currentTimeMs()
    });
  }
};

const createPages = async () => {
  const profileImageId = '57660d42-b3f9-45fd-90ab-d162cea75500';

  await knex('media_metadatas').insert({
    id: profileImageId,
    type: 'image',
    mime_type: 'image/jpeg',
    created_at: currentTimeMs()
  });
  await knex('pages').insert({
    id: PageRepository.getAppPageId(),
    name: 'Vinteres',
    profile_image_id: profileImageId,
    created_at: currentTimeMs()
  });
};

(async () => {
  const users = await addUsers();
  await setUsersCompatibility(users.map(compatibilityInfo));
  await setUsersSearchPreferences(users.map(user => user.id));
  await createPages();
})();
