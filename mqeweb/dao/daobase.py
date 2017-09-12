from mqe.dao.daobase import BaseDAO

class UserDAO(BaseDAO):
    """A user row has the following columns:

    * user_id uuid
    * email text
    * user_data text

    """

    def select(self, user_id):
        """Select a user row by user_id"""
        raise NotImplementedError()

    def select_by_email(self, email):
        """Select a user row by email"""
        raise NotImplementedError()

    def insert(self, email, password):
        """Insert and return a new user row, generating user_id"""
        raise NotImplementedError()

    def delete(self, user_id):
        """Delete the user row"""
        raise NotImplementedError()

    def update_user_data(self, user_id, new_user_data):
        """Update the column user_data of the user_row specified by user_id, assigning the
        value new_user_data"""
        raise NotImplementedError()

    def is_password_valid(self, user_id, password):
        """Return a boolean telling if the password matches the password stored for
        the user_row specified by user_id"""
        raise NotImplementedError()


class ApiKeyDAO(BaseDAO):
    """An api_key row has the following columns:

    * user_id uuid
    * key text

    """

    def set(self, user_id, api_key):
        """Set the content of the column key of the api_key row specified by user_id,
        assigning the value of the parameter api_key"""
        raise NotImplementedError()

    def select(self, user_id):
        """Select the value of the key column of the api_key row specified by user_id"""
        raise NotImplementedError()

    def select_user_id(self, api_key):
        """Select the value of the user_id column of the api_key row specified by api_key"""
        raise NotImplementedError()

