import User from '../models/User.js';

const checkPermission = (permission) => {
    return async (req, res, next) => {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (user.role === 'admin') {
                return next(); // Admins have all permissions
            }

            if (user.permissions && user.permissions.includes(permission)) {
                return next();
            }

            return res.status(403).json({ message: `Access denied: missing permission '${permission}'` });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    };
};

export default checkPermission;
