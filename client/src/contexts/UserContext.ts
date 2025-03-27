import { createContext } from 'react';
import { FakeSOSocket, SafeDatabaseUser } from '../types/types';

// Define dummy defaults (they will never be used because protected routes will override them)
const dummyUser = {} as SafeDatabaseUser;
const dummySocket = {} as FakeSOSocket;

export interface UserContextType {
  user: SafeDatabaseUser;
  socket: FakeSOSocket;
  setUser: (user: SafeDatabaseUser) => void;
}

const DefaultContext: UserContextType = {
  user: dummyUser,
  socket: dummySocket,
  setUser: () => {},
};

const UserContext = createContext<UserContextType>(DefaultContext);

export default UserContext;
