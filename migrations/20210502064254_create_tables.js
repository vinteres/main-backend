
exports.up = (knex) => {
  return knex.raw(`
    CREATE TYPE user_status_type AS ENUM (
      'onboarding',
      'active',
      'suspended',
      'deleted'
    );

    CREATE TYPE gender AS ENUM (
      'male',
      'female',
      'other'
    );

    CREATE TYPE notification_type AS ENUM (
      'intro_like',
      'matched',
      'view'
    );

    CREATE TYPE amount AS ENUM (
      'regularly',
      'sometimes',
      'never'
    );

    CREATE TYPE body_type AS ENUM (
      'fit',
      'curvy',
      'average',
      'skinny'
    );

    CREATE TYPE children_status_type AS ENUM (
      'has',
      'does_not_have'
    );

    CREATE TYPE pet_status_type AS ENUM (
      'cat',
      'dog',
      'other',
      'none'
    );

    CREATE TYPE media_type AS ENUM (
      'video',
      'audio',
      'image'
    );

    CREATE TYPE image_size AS ENUM (
      'small',
      'big'
    );

    CREATE TYPE intro_type AS ENUM (
      'message',
      'video',
      'audio',
      'smile'
    );

    create TYPE feedback_type as ENUM (
      'bug',
      'feature',
      'other'
    );

    CREATE TYPE report_type as ENUM (
      'inappropriate',
      'abusive',
      'scam',
      'fake',
      'underage',
      'other'
    );

    CREATE TABLE media_metadatas (
      id UUID PRIMARY KEY,
      type media_type NOT NULL,
      mime_type VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE countries (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE cities (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      country_id UUID NOT NULL REFERENCES countries(id),
      created_at BIGINT NOT NULL
    );

    CREATE TABLE users (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      title VARCHAR(70),
      description VARCHAR(255),
      ideal_match VARCHAR(255),
      birthday DATE,
      age INTEGER,
      gender gender,
      interested_in gender,
      height INTEGER,
      smoking amount,
      drinking amount,
      body body_type,
      children_status children_status_type,
      pet_status pet_status_type,
      city_id UUID REFERENCES cities(id),
      password VARCHAR(255),
      user_status user_status_type NOT NULL,
      profile_image_id UUID REFERENCES media_metadatas(id),
      verified BOOLEAN NOT NULL,
      last_login_at BIGINT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE onboarding (
      user_id UUID REFERENCES users(id),
      step INTEGER NOT NULL,
      completed_at BIGINT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE user_images (
      user_id UUID REFERENCES users(id),
      image_id UUID NOT NULL REFERENCES media_metadatas(id),
      position INTEGER NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE session_tokens (
      token VARCHAR(255) PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      remember BOOLEAN NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE chats (
      id UUID PRIMARY KEY,
      last_message_at BIGINT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE chat_members (
      chat_id UUID REFERENCES chats(id),
      user_id UUID NOT NULL REFERENCES users(id),
      not_seen_count INTEGER NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE chat_messages (
      id UUID PRIMARY KEY,
      chat_id UUID REFERENCES chats(id),
      user_id UUID NOT NULL REFERENCES users(id),
      text TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE hobbies (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE user_hobbies (
      user_id UUID REFERENCES users(id),
      hobbie_id UUID NOT NULL REFERENCES hobbies(id)
    );

    CREATE TABLE free_time_activities (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE user_free_time_activities (
      user_id UUID REFERENCES users(id),
      activity_id UUID NOT NULL REFERENCES free_time_activities(id)
    );

    CREATE TABLE notifications (
      id UUID PRIMARY KEY,
      from_user_id UUID NOT NULL,
      to_user_id UUID NOT NULL,
      type notification_type NOT NULL,
      rel_type VARCHAR NOT NULL,
      rel_id UUID NOT NULL,
      seen BOOLEAN NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE intros (
      id UUID PRIMARY KEY,
      from_user_id UUID NOT NULL REFERENCES users(id),
      to_user_id UUID NOT NULL REFERENCES users(id),
      type intro_type NOT NULL,
      message VARCHAR(255),
      media_metadata_id UUID REFERENCES media_metadatas(id),
      liked_at BIGINT,
      seen BOOLEAN NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE matches (
      user_one_id UUID REFERENCES users(id),
      user_two_id UUID REFERENCES users(id),
      created_at BIGINT NOT NULL
    );

    CREATE TABLE reports (
      reporter_user_id UUID REFERENCES users(id),
      reported_user_id UUID REFERENCES users(id),
      type report_type NOT NULL,
      details text NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE feedbacks (
      user_id UUID REFERENCES users(id),
      type feedback_type NOT NULL,
      details text NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE search_preferences (
      user_id UUID PRIMARY KEY,
      from_age INTEGER NOT NULL,
      to_age INTEGER NOT NULL,
      city_id UUID NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE questions (
      id UUID PRIMARY KEY,
      text VARCHAR(255) NOT NULL,
      quiz_step INTEGER NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE answers (
      id UUID PRIMARY KEY,
      text VARCHAR(255) NOT NULL,
      question_id UUID NOT NULL REFERENCES questions(id),
      created_at BIGINT NOT NULL
    );

    CREATE TABLE user_answers (
      user_id UUID REFERENCES users(id),
      answer_id UUID NOT NULL REFERENCES answers(id),
      question_id UUID NOT NULL REFERENCES questions(id)
    );

    CREATE TABLE user_compatability (
      user_one_id UUID NOT NULL REFERENCES users(id),
      user_two_id UUID NOT NULL REFERENCES users(id),
      percent INTEGER NOT NULL
    );

    CREATE TABLE user_views (
      viewer_user_id UUID REFERENCES users(id),
      viewed_user_id UUID REFERENCES users(id),
      count INTEGER NOT NULL,
      last_viewed_at BIGINT NOT NULL
    );
  `)
};

exports.down = (knex) => {
  return Promise.all([
    knex.raw(`DROP TYPE user_status_type`),
    knex.raw(`DROP TYPE gender`),
    knex.raw(`DROP TYPE notification_type`),
    knex.raw(`DROP TYPE amount`),
    knex.raw(`DROP TYPE body_type`),
    knex.raw(`DROP TYPE children_status_type`),
    knex.raw(`DROP TYPE pet_status_type`),
    knex.raw(`DROP TYPE media_type`),
    knex.raw(`DROP TYPE image_size`),
    knex.raw(`DROP TYPE intro_type`),
    knex.raw(`DROP TYPE feedback_type`),
    knex.raw(`DROP TYPE report_type`),

    knex.raw(`DROP TABLE user_views`),
    knex.raw(`DROP TABLE user_compatability`),
    knex.raw(`DROP TABLE user_answers`),
    knex.raw(`DROP TABLE answers`),
    knex.raw(`DROP TABLE questions`),
    knex.raw(`DROP TABLE search_preferences`),
    knex.raw(`DROP TABLE feedbacks`),
    knex.raw(`DROP TABLE reports`),
    knex.raw(`DROP TABLE matches`),
    knex.raw(`DROP TABLE intros`),
    knex.raw(`DROP TABLE notifications`),
    knex.raw(`DROP TABLE user_free_time_activities`),
    knex.raw(`DROP TABLE free_time_activities`),
    knex.raw(`DROP TABLE user_hobbies`),
    knex.raw(`DROP TABLE hobbies`),
    knex.raw(`DROP TABLE chat_messages`),
    knex.raw(`DROP TABLE chat_members`),
    knex.raw(`DROP TABLE chats`),
    knex.raw(`DROP TABLE session_tokens`),
    knex.raw(`DROP TABLE user_images`),
    knex.raw(`DROP TABLE onboarding`),
    knex.raw(`DROP TABLE users`),
    knex.raw(`DROP TABLE cities`),
    knex.raw(`DROP TABLE countries`),
  ])
};

exports.config = { transaction: false };
