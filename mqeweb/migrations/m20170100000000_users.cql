CREATE TABLE mqe.user (
    user_id uuid,
    email text,
    password text,
    user_data text,
    created timestamp,
    PRIMARY KEY(user_id)
);

CREATE TABLE mqe.user_by_email (
    email text,
    user_id uuid,
    PRIMARY KEY(email)
);


CREATE TABLE mqe.api_key (
    api_key text,
    user_id uuid,
    PRIMARY KEY(api_key)
);

CREATE TABLE mqe.api_key_by_user (
    user_id uuid,
    api_key text,
    PRIMARY KEY(user_id)
);
