from models import User


class UserManager:

    def __init__(self, session):
        self.session = session

    def create_user(self, full_name, email, username):
        new_user = User(
            full_name=full_name,
            email=email,
            username=username
        )

        self.session.add(new_user)
        self.session.commit()
        self.session.refresh(new_user)

        return new_user

    def update_user(self, user_id, full_name=None, email=None, username=None):
        user = self.session.query(User).filter_by(user_id=user_id).first()

        if not user:
            return None

        if full_name:
            user.full_name = full_name

        if email:
            user.email = email

        if username:
            user.username = username

        self.session.commit()
        self.session.refresh(user)

        return user

    def delete_user(self, user_id):
        user = self.session.query(User).filter_by(user_id=user_id).first()

        if not user:
            return False

        self.session.delete(user)
        self.session.commit()

        return True

    def get_all_users(self):
        return self.session.query(User).all()

    def get_user_by_id(self, user_id):
        return self.session.query(User).filter_by(user_id=user_id).first()