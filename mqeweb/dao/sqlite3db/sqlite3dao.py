import datetime

import werkzeug.security

from mqe.dbutil import gen_uuid
from mqe.dao.sqlite3db.sqlite3util import closing_cursor as cursor, insert

from mqeweb.dao import daobase


class Sqlite3UserDAO(daobase.UserDAO):

    def select(self, user_id):
        with cursor() as cur:
            cur.execute("""SELECT * FROM user WHERE user_id=?""", [user_id])
            return cur.fetchone()


    def select_by_email(self, email):
        with cursor() as cur:
            cur.execute("""SELECT * FROM user WHERE email=?""", [email])
            return cur.fetchone()


    def insert(self, email, password):
        if self.select_by_email(email) is not None:
            raise ValueError('User exists: %r' % email)
        user_id = gen_uuid()
        pw_hash = werkzeug.security.generate_password_hash(password)
        with cursor() as cur:
            cur.execute(*insert('user', {
                'user_id': user_id,
                'email': email,
                'password': pw_hash,
                'created': datetime.datetime.utcnow(),
            }))
            return self.select(user_id)


    def delete(self, user_id):
        with cursor() as cur:
            cur.execute("""DELETE FROM user WHERE user_id=?""", [user_id])


    def update_user_data(self, user_id, new_user_data):
        with cursor() as cur:
            cur.execute("""UPDATE user SET user_data=? WHERE user_id=?""",
                        [new_user_data, user_id])


    def is_password_valid(self, user_id, password):
        with cursor() as cur:
            cur.execute("""SELECT password FROM user WHERE user_id=?""", [user_id])
            row = cur.fetchone()
            if not row:
                return False
            return werkzeug.security.check_password_hash(row['password'], password)



class Sqlite3ApiKeyDAO(daobase.ApiKeyDAO):

    def set(self, user_id, api_key):
        with cursor() as cur:
            cur.execute("""UPDATE user SET api_key=? WHERE user_id=?""",
                        [api_key, user_id])

    def select(self, user_id):
        with cursor() as cur:
            cur.execute("""SELECT api_key FROM user
                           WHERE user_id=?""", [user_id])
            row = cur.fetchone()
            if not row:
                return None
            return row['api_key']

    def select_user_id(self, api_key):
        with cursor() as cur:
            cur.execute("""SELECT user_id FROM user
                           WHERE api_key=?""", [api_key])
            row = cur.fetchone()
            if not row:
                return None
            return row['user_id']
