from werkzeug.security import check_password_hash, generate_password_hash

from models import User


class UserRepository:
    def __init__(self, session):
        self.session = session

    def create_user(self, username, password, role="user"):
        user = User(
            username=username,
            password_hash=generate_password_hash(password),
            role=role,
        )
        self.session.add(user)
        self.session.flush()
        return user

    def get_by_id(self, user_id):
        return self.session.get(User, user_id)

    def get_by_username(self, username):
        return self.session.query(User).filter(User.username == username).first()

    def verify_credentials(self, username, password):
        user = self.get_by_username(username)
        if user is None or not check_password_hash(user.password_hash, password):
            return None
        return user

    def ensure_admin(self, username, password):
        user = self.get_by_username(username)
        if user is None:
            user = self.create_user(username=username, password=password, role="admin")
        if user.role != "admin":
            user.role = "admin"
            self.session.flush()
        return user
