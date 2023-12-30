const tools = require("../tools/tools.js").default.default;
const config = require("../config.json");
const request = require("request");
const express = require("express");
const router = express.Router();

/** /api_call **/
router.get("/", function (req, res) {
  const token = tools.getToken(req.session);
  if (!token) return res.json({ error: "Not authorized" });
  if (!req.session.realmId)
    return res.json({
      error:
        "No realm ID.  QBO calls only work if the accounting scope was passed!",
    });

  // Set up API call (with OAuth2 accessToken)
  const url = `${config.api_uri + req.session.realmId}/companyinfo/${
    req.session.realmId
  }`;
  const requestObj = {
    url,
    headers: {
      Authorization: "Bearer " + token.accessToken,
      Accept: "application/json",
    },
  };

  // Make API call
  request(requestObj, function (err, response) {
    // Check if 401 response was returned - refresh tokens if so!
    tools.checkForUnauthorized(req, requestObj, err, response).then(
      ({ err, response }) => {
        if (err || response.statusCode != 200) {
          return res.json({ error: err, statusCode: response.statusCode });
        }

        // API Call was a success!
        res.json(JSON.parse(response.body));
      },
      (err) => {
        return res.json(err);
      }
    );
  });
});

/** /api_call/revoke **/
router.get("/revoke", function (req, res) {
  const token = tools.getToken(req.session);
  if (!token) return res.json({ error: "Not authorized" });

  const url = tools.revoke_uri;
  request(
    {
      url,
      method: "POST",
      headers: {
        Authorization: `Basic ${tools.basicAuth}`,
        Accept: "application/json",
        "Content-Type": `application/json`,
      },
      body: JSON.stringify({
        token: token.accessToken,
      }),
    },
    (err, response, body) => {
      if (err || response.statusCode != 200) {
        return res.json({ error: err, statusCode: response.statusCode });
      }
      tools.clearToken(req.session);
      const extractedText = `R`;
      res.json({ response: `${extractedText}evoke successful` });
    }
  );
});

/** /api_call/refresh **/
// Note: typical use case would be to refresh the tokens internally (not an API call)
// We recommend refreshing upon receiving a 401 Unauthorized response from Intuit.
// A working example of this can be seen above: `/api_call`
router.get("/refresh", function (req, res) {
  const token = tools.getToken(req.session);
  if (!token) return res.json({ error: "Not authorized" });

  tools.refreshTokens(req.session).then(
    (newToken) => {
      // We have new tokens!
      res.json({
        accessToken: newToken.accessToken,
        refreshToken: newToken.refreshToken,
      });
    },
    (err) => {
      // Did we try to call refresh on an old token?
      console.log(err);
      res.json(err);
    }
  );
});

module.exports = router;
