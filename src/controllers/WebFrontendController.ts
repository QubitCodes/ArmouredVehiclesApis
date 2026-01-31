import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { User, FrontendSlider, FrontendAd, sequelize } from '../models';
import { verifyAccessToken } from '../utils/jwt';
import { getFileUrl } from '../utils/fileUrl';
import { Op } from 'sequelize';

export class WebFrontendController extends BaseController {

    private async verifyAdmin(req: NextRequest) {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) return { error: 'Unauthorized', status: 401 };
            
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            if (!decoded) return { error: 'Invalid Token', status: 401 };

            const user = await User.findByPk(decoded.userId || decoded.sub);
            if (!user) return { error: 'User not found', status: 401 };

            if (!['admin', 'super_admin'].includes(user.user_type)) {
                return { error: 'Forbidden', status: 403 };
            }

            return { user };
        } catch (e) {
            return { error: 'Authentication Failed', status: 401 };
        }
    }

    // --- Sliders ---

    /**
     * listSliders
     * GET /api/v1/admin/web-frontend/sliders
     * Public access allowed? Validated only via active flag? 
     * Admin sees all, Public sees active.
     */
    async getSliders(req: NextRequest) {
        try {
            // Check auth to see if admin
            const authHeader = req.headers.get('authorization');
            let isAdmin = false;
            
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                     const token = authHeader.split(' ')[1];
                     const decoded: any = verifyAccessToken(token);
                     const user = await User.findByPk(decoded?.userId || decoded?.sub);
                     if (user && ['admin', 'super_admin'].includes(user.user_type)) {
                         isAdmin = true;
                     }
                } catch (e) { /* ignore */ }
            }

            const whereClause: any = {};
            if (!isAdmin) {
                whereClause.is_active = true;
                whereClause.valid_till = {
                    [Op.or]: [
                        { [Op.gte]: new Date() },
                        { [Op.eq]: null }
                    ]
                };
            }

            const sliders = await FrontendSlider.findAll({
                where: whereClause,
                order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
            });

            const formatted = sliders.map((s: any) => {
                const json = s.toJSON();
                return {
                    ...json,
                    image_url: getFileUrl(json.image_url)
                };
            });

            return this.sendSuccess(formatted);

        } catch (error: any) {
            return this.sendError(error.message, 500);
        }
    }

    async createSlider(req: NextRequest, parsedData?: { data: any, files: File[] }) {
        const check = await this.verifyAdmin(req);
        if (check.error) return this.sendError(check.error, check.status!);

        try {
            const body = parsedData ? parsedData.data : await req.json();
            let imagePath = body.image_url;


            if (!imagePath) {
                return this.sendError('Image is required', 400);
            }

            const slider = await FrontendSlider.create({
                image_url: imagePath,
                title: body.title || null,
                subtitle: body.subtitle || null,
                link: body.link || null,
                button_text: body.button_text || null,
                is_active: body.is_active === 'true' || body.is_active === true,
                valid_till: body.valid_till ? new Date(body.valid_till) : undefined,
                sort_order: body.sort_order ? parseInt(body.sort_order) : 0
            });

            return this.sendSuccess(slider, 'Slider created Successfully', 201);

        } catch (error: any) {
            return this.sendError(error.message, 500);
        }
    }

    async updateSlider(req: NextRequest, { params }: { params: Promise<{ id: string }> }, parsedData?: { data: any, files: File[] }) {
        const check = await this.verifyAdmin(req);
        if (check.error) return this.sendError(check.error, check.status!);

        try {
            const { id } = await params;
            const slider = await FrontendSlider.findByPk(id);
            if (!slider) return this.sendError('Slider not found', 404);

            const body = parsedData ? parsedData.data : await req.json();
            
            const imagePath = body.image_url || slider.image_url;


            await slider.update({
                image_url: imagePath,
                title: body.title !== undefined ? body.title : slider.title,
                subtitle: body.subtitle !== undefined ? body.subtitle : slider.subtitle,
                link: body.link !== undefined ? body.link : slider.link,
                button_text: body.button_text !== undefined ? body.button_text : slider.button_text,
                is_active: body.is_active !== undefined ? (body.is_active === 'true' || body.is_active === true) : slider.is_active,
                valid_till: body.valid_till ? new Date(body.valid_till) : (body.valid_till === null ? null : slider.valid_till),
                sort_order: body.sort_order !== undefined ? parseInt(body.sort_order) : slider.sort_order
            });

            return this.sendSuccess(slider, 'Slider updated successfully');

        } catch (error: any) {
             return this.sendError(error.message, 500);
        }
    }

    async deleteSlider(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        const check = await this.verifyAdmin(req);
        if (check.error) return this.sendError(check.error, check.status!);

        try {
            const { id } = await params;
            const slider = await FrontendSlider.findByPk(id);
            if (!slider) return this.sendError('Slider not found', 404);

            await slider.destroy();
            return this.sendSuccess(null, 'Slider deleted successfully');
        } catch (error: any) {
            return this.sendError(error.message, 500);
        }
    }

    // --- Ads ---
    
    async getAds(req: NextRequest) {
        try {
            const { searchParams } = new URL(req.url);
            const location = searchParams.get('location');

             // Check auth to see if admin
            const authHeader = req.headers.get('authorization');
            let isAdmin = false;
            
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                     const token = authHeader.split(' ')[1];
                     const decoded: any = verifyAccessToken(token);
                     const user = await User.findByPk(decoded?.userId || decoded?.sub);
                     if (user && ['admin', 'super_admin'].includes(user.user_type)) {
                         isAdmin = true;
                     }
                } catch (e) { /* ignore */ }
            }

            const whereClause: any = {};
            if (location) whereClause.location = location;

            let queryOptions: any = {
                where: whereClause,
                order: [['created_at', 'DESC']]
            };

            if (!isAdmin) {
                whereClause.is_active = true;
                 whereClause.valid_till = {
                    [Op.or]: [
                        { [Op.gte]: new Date() },
                        { [Op.eq]: null }
                    ]
                };
                // Randomize and limit to 1 for public view
                queryOptions.order = [sequelize.random()];
                queryOptions.limit = 1;
            }

            const ads = await FrontendAd.findAll(queryOptions);

            const formatted = ads.map((ad: any) => {
                const json = ad.toJSON();
                return {
                    ...json,
                    image_url: getFileUrl(json.image_url)
                };
            });

            return this.sendSuccess(formatted);

        } catch (error: any) {
            return this.sendError(error.message, 500);
        }
    }

    async createAd(req: NextRequest, parsedData?: { data: any, files: File[] }) {
        const check = await this.verifyAdmin(req);
        if (check.error) return this.sendError(check.error, check.status!);

        try {
            const body = parsedData ? parsedData.data : await req.json();
            let imagePath = body.image_url;


            const ad = await FrontendAd.create({
                location: body.location,
                image_url: imagePath,
                title: body.title || null,
                link: body.link || null,
                is_active: body.is_active === 'true' || body.is_active === true,
                valid_till: body.valid_till ? new Date(body.valid_till) : undefined
            });

            return this.sendSuccess(ad, 'Ad created Successfully', 201);

        } catch (error: any) {
            return this.sendError(error.message, 500);
        }
    }

    async updateAd(req: NextRequest, { params }: { params: Promise<{ id: string }> }, parsedData?: { data: any, files: File[] }) {
        const check = await this.verifyAdmin(req);
        if (check.error) return this.sendError(check.error, check.status!);

        try {
            const { id } = await params;
            const ad = await FrontendAd.findByPk(id);
            if (!ad) return this.sendError('Ad not found', 404);

            const body = parsedData ? parsedData.data : await req.json();
            const imagePath = body.image_url || ad.image_url;


            await ad.update({
                location: body.location || ad.location,
                image_url: imagePath,
                title: body.title !== undefined ? body.title : ad.title,
                link: body.link !== undefined ? body.link : ad.link,
                is_active: body.is_active !== undefined ? (body.is_active === 'true' || body.is_active === true) : ad.is_active,
                 valid_till: body.valid_till ? new Date(body.valid_till) : (body.valid_till === null ? null : ad.valid_till)
            });

            return this.sendSuccess(ad, 'Ad updated successfully');

        } catch (error: any) {
             return this.sendError(error.message, 500);
        }
    }

    async deleteAd(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        const check = await this.verifyAdmin(req);
        if (check.error) return this.sendError(check.error, check.status!);

        try {
            const { id } = await params;
            const ad = await FrontendAd.findByPk(id);
            if (!ad) return this.sendError('Ad not found', 404);

            await ad.destroy();
            return this.sendSuccess(null, 'Ad deleted successfully');
        } catch (error: any) {
            return this.sendError(error.message, 500);
        }
    }

}
