import base64
import logging
import os

from mqe import c
from mqe import serialize
from mqe.dbutil import Row, JsonColumn, UUIDColumn, TextColumn


log = logging.getLogger('mio.users')


API_KEY_LEN = 24
PBKDF2_ITERATIONS = 10000


class User(Row):
    """A representation of a user - a database row from the table ``mqe.user``."""

    user_id = UUIDColumn('user_id')

    email = TextColumn('email')

    #: The content of the ``mqe.user.user_data`` column deserialized from JSON.
    #: The value is usually a dictionary holding user preferences. It can be updated by
    #: calling :meth:`update_user_data`.
    user_data = JsonColumn('user_data', default=lambda: {})

    @staticmethod
    def select(user_id):
        """Returns a :class:`User` object for the given user ID, ``None`` if such user doesn't exist"""
        row = c.dao.UserDAO.select(user_id)
        return User(row) if row else None

    @staticmethod
    def select_by_email(email):
        """Returns a :class:`User` having the email, ``None`` if such user doesn't exist"""
        row = c.dao.UserDAO.select_by_email(email)
        return User(row) if row else None

    @staticmethod
    def insert(email, password):
        row = c.dao.UserDAO.insert(email, password)
        return User(row) if row else None

    def delete_user(self):
        """Deletes the user"""
        c.dao.UserDAO.delete(self.user_id)

    def update_user_data(self, d):
        """Update the ``mqe.user.user_data`` column holding a custom JSON-serializable dictionary.
        The ``d`` is a dictionary which items will be assigned to the ``user_data`` dictionary.
        """
        assert isinstance(d, dict)
        row = c.dao.UserDAO.select(self.user_id)
        user_data = serialize.json_loads(row['user_data'])
        user_data.update(d)
        c.dao.UserDAO.update_user_data(self.user_id, serialize.mjson(user_data))
        self['user_data'] = serialize.mjson(user_data)
        # clear cached value
        del self.user_data

    skip_printing = ('password', 'user_data')




### Passwords

def is_password_valid(user_id, password):
    """Tells whether the given ``password`` matches the password hash stored when the user was registered"""
    return c.dao.UserDAO.is_password_valid(user_id, password)



### API keys

def _generate_api_key():
    bytes = os.urandom(API_KEY_LEN)
    return base64.b64encode(bytes, 'ab').rstrip('=')[:API_KEY_LEN]

def assign_new_api_key(user_id):
    """Assigns new API key to the user"""
    api_key = _generate_api_key()
    c.dao.ApiKeyDAO.set(user_id, api_key)

def select_api_key(user_id):
    """Returns an API key assigned to the user (``None`` if no such key could be found)"""
    return c.dao.ApiKeyDAO.select(user_id)

def select_user_id_of_api_key(api_key):
    """Returns user ID associated with the api key"""
    return c.dao.ApiKeyDAO.select_user_id(api_key)

