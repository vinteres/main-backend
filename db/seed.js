const uuid = require('uuid');
const PageRepository = require('../app/repositories/page_repository.js');
const { currentTimeMs, calculateAge } = require('../app/utils.js');
const environment = process.env.ENVIRONMENT || 'development'
const config = require('../knexfile.js')[environment];
const knex = require('knex')(config);
const QuizService = require('../app/services/quiz_service');
const QuizRepository = require('../app/repositories/quiz_repository');
const UserRepository = require('../app/repositories/user_repository');
const { getClient } = require('../app/db');

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
  const email = `m${ti}@mail.com`;
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
    interested_in: 'male' === gender ? 'female' : 'male',
    city_id: cityId,
    user_status: 'active',
    verification_status: verificationStatus,
    verified,
    created_at: createdAt
  };
};

addUsers = async () => {
  const USERS_PER_GENDER = 200;
  const users = [];

  for (let i = 0; i < USERS_PER_GENDER; i++) {
    const user = buildUser(i, 'male');
    await knex('users').insert(user);

    users.push(user);
  }

  for (let i = 0; i < USERS_PER_GENDER; i++) {
    const user = buildUser(i, 'female', USERS_PER_GENDER);
    await knex('users').insert(user);

    users.push(user);
  }

  return users;
};

setUsersCompatibility = async (users, con) => {
  const quizService = new QuizService(
    new QuizRepository(con),
    new UserRepository(con)
  )
  const answers = await knex('answers');

  const qa = {};
  answers.forEach(({ id, question_id }) => {
    if (!qa[question_id]) qa[question_id] = [];

    qa[question_id].push(id)
  });

  for (const user of users) {
    const userAnswers = [];
    Object.keys(qa).forEach(question_id => {
      userAnswers.push({
        user_id: user.id,
        question_id,
        answer_id: qa[question_id][randomNumberBetween(qa[question_id].length)]
      })
    });

    await knex('user_answers').insert(userAnswers);
  };

  for (const user of users) {
    await quizService.backfillCompatibility(user.id);
  }
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

(async () => {
  const con = await getClient();
  try {
    const users = await addUsers();

    await setUsersCompatibility(users, con);
    await setUsersSearchPreferences(users.map(user => user.id));

    console.log('DONE!');
  } finally {
    con.release();
  }
})();
