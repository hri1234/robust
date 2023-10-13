const express = require('express');
const { registerSell, loginSell, logoutSell, getSellDetails, forgotPassword, resetPassword, updatePassword, updateProfile, getAllSell, getSingleSell, updateSellRole, deleteSell } = require('../controllers/sellController');
const { isAuthenticatedSell, authorizeRoles } = require('../middlewares/sellauth');

const router = express.Router();

router.route('/register').post(registerSell);
router.route('/login').post(loginSell);
router.route('/logout').get(logoutSell);

router.route('/me').get(isAuthenticatedSell, getSellDetails);

router.route('/password/forgot').post(forgotPassword);
router.route('/password/reset/:token').put(resetPassword);

router.route('/password/update').put(isAuthenticatedSell, updatePassword);

router.route('/me/update').put(isAuthenticatedSell, updateProfile);

router.route("/admin/sell").get(isAuthenticatedSell, authorizeRoles("admin"), getAllSell);

router.route("/admin/sell/:id")
   // .get(isAuthenticatedSell, authorizeRoles("admin"), getSingleSell)
    .put(isAuthenticatedSell, authorizeRoles("admin"), updateSellRole)
    .delete(isAuthenticatedSell, authorizeRoles("admin"), deleteSell);

module.exports = router;