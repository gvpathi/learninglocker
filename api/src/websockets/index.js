import {
  getCookieName,
  getCookieNameStartsWith
} from 'ui/utils/auth';
import { verifyToken } from 'api/auth/passport';
import { getConnection } from 'lib/connections/mongoose';
import { SUPPORTED_SCHEMAS } from 'lib/constants/websocket';
import {
  isUndefined,
  get,
  set,
  includes,
  capitalize
} from 'lodash';
import logger from 'lib/logger';

const getModel = (schema) => {
  if ((includes(SUPPORTED_SCHEMAS, schema))) {
    return getConnection().model(capitalize(schema));
  }
};

const messageManager = (ws, state) => async (message) => {
  const jsonMessage = JSON.parse(message);
  switch (jsonMessage.type) {
    case 'REGISTER': {
      let cookieName;

      if (jsonMessage.organisationId) {
        cookieName = getCookieName({
          tokenType: 'organisation',
          tokenId: jsonMessage.organisationId
        });
      } else {
        cookieName = getCookieNameStartsWith({
          tokenType: 'user'
        }, jsonMessage.auth);
      }

      const model = getModel(jsonMessage.schema);
      if (isUndefined(model)) {
        break;
      }

      const token = jsonMessage.auth[cookieName];
      let authInfo;
      try {
        authInfo = (await verifyToken(token)).authInfo;
      } catch (err) {
        ws.close();
        break;
      }

      const result = await model.getConnectionWs({
        filter: jsonMessage.filter,
        ...jsonMessage.cursor,
        authInfo,
        sort: jsonMessage.sort,
        ws,
        first: get(jsonMessage, 'first'),
        last: get(jsonMessage, 'last'),
        history: get(state, ['history', jsonMessage.schema], [])
      });

      const { changeStream, history: cursorHistory } = result;

      set(state, ['history', jsonMessage.schema], cursorHistory);

      ws.on('error', (err) => {
        logger.error('websocket error', err);

        if (changeStream) {
          changeStream.driverChangeStream.close();
          changeStream.removeAllListeners();
        }
      });
      ws.on('close', () => {
        if (changeStream) {
          changeStream.driverChangeStream.close();
          changeStream.removeAllListeners();
        }
      });

      break;
    }
    default:
      break;
  }
};

const add = (ws) => {
  const state = {
    history: {}
  };
  ws.on('message', messageManager(ws, state));
};

export default {
  add
};