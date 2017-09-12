import datetime

import werkzeug.security

from mqe import c
from mqe.dbutil import gen_uuid
from mqe.dao.cassandradb.cassandrautil import batch, insert, bind
from mqe import serialize

from mqeweb.dao import daobase


class CassandraUserDAO(daobase.UserDAO):

    def select(self, user_id):
        rows = c.cass.execute("""SELECT * FROM mqe.user WHERE user_id=?""", [user_id])
        return rows[0] if rows else None


    def select_by_email(self, email):
        user_id = c.cass.execute_fst("""SELECT user_id FROM mqe.user_by_email WHERE email=?""", [email])['user_id']
        if not user_id:
            return None
        return self.select(user_id)


    def insert(self, email, password):
        if self.select_by_email(email) is not None:
            raise ValueError('User exists: %r' % email)
        user_id = gen_uuid()
        pw_hash = werkzeug.security.generate_password_hash(password)
        c.cass.execute(batch(
            insert('mqe.user', {
                'user_id': user_id,
                'email': email,
                'password': pw_hash,
                'created': datetime.datetime.utcnow(),
                'user_data': serialize.mjson({}),
            }),
            insert('mqe.user_by_email', {'email': email, 'user_id': user_id}),
        ))
        return self.select(user_id)

    def delete(self, user_id):
        row = self.select(user_id)
        if not row:
            return
        c.cass.execute(batch(
            bind("""DELETE FROM mqe.user WHERE user_id=?""", [row['user_id']]),
            bind("""DELETE FROM mqe.user_by_email WHERE email=?""", [row['email']]),
        ))

    def update_user_data(self, user_id, new_user_data):
        c.cass.execute("""UPDATE mqe.user SET user_data=? WHERE user_id=?""",
                       [new_user_data, user_id])

    def is_password_valid(self, user_id, password):
        pw_hash = c.cass.execute_fst("""SELECT password FROM mqe.user WHERE user_id=?""", [user_id])['password']
        if not pw_hash:
            return False
        return werkzeug.security.check_password_hash(pw_hash, password)


class CassandraApiKeyDAO(daobase.ApiKeyDAO):

    def set(self, user_id, api_key):
        c.cass.execute(batch(
            insert('mqe.api_key', dict(api_key=api_key, user_id=user_id)),
            insert('mqe.api_key_by_user', dict(user_id=user_id, api_key=api_key))
        ))

    def select(self, user_id):
        return c.cass.execute_fst("""SELECT api_key FROM mqe.api_key_by_user
                                     WHERE user_id=?""", [user_id])['api_key']

    def select_user_id(self, api_key):
        return c.cass.execute_fst("""SELECT user_id FROM mqe.api_key
                                     WHERE api_key=?""", [api_key])['user_id']
