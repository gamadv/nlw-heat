import axios from 'axios';
import prismaCliente from '../prisma';
import { sign } from 'jsonwebtoken';

interface IAuthenticateUserService {
  access_token: string;
}
interface IGithubUser {
  avatar_url: string;
  login: string;
  id: number;
  name: string;
}

class AuthenticateUserService {
  async execute(code: string) {
    const url = 'https://github.com/login/oauth/access_token';
    const githubApi = 'https://api.github.com/user';

    const { data: token } = await axios.post<IAuthenticateUserService>(
      url,
      null,
      {
        params: {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const { data } = await axios.get<IGithubUser>(githubApi, {
      headers: {
        authorization: `Bearer ${token.access_token}`,
      },
    });

    const { avatar_url, id, login, name } = data;

    let user = await prismaCliente.user.findFirst({
      where: {
        github_id: id,
      },
    });

    if (!user) {
      user = await prismaCliente.user.create({
        data: {
          github_id: id,
          login,
          avatar_url,
          name,
        },
      });
    }

    const authtoken = sign(
      {
        user: {
          name: user.name,
          avatar_url: user.avatar_url,
          id: user.id,
        },
      },
      process.env.JWT_SECRET,
      {
        subject: user.id,
        expiresIn: '1d',
      }
    );
    return { authtoken, user };
  }
}

export { AuthenticateUserService };
