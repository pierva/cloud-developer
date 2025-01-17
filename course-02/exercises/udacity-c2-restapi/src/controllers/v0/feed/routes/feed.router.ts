import { Router, Request, Response } from 'express';
import { FeedItem } from '../models/FeedItem';
import { requireAuth } from '../../users/routes/auth.router';
import * as AWS from '../../../../aws';

const router: Router = Router();

// Get all feed items
router.get('/', async (req: Request, res: Response) => {
    const items = await FeedItem.findAndCountAll({order: [['id', 'DESC']]});
    items.rows.map((item) => {
            if(item.url) {
                item.url = AWS.getGetSignedUrl(item.url);
            }
    });
    res.send(items);
});

// Get a specific resource
router.get('/:id',
    async (req: Request, res: Response) => {
    let { id } = req.params;
    if(id) {
        const item = await FeedItem.findByPk(id);
        if (item) {
            res.status(201).send(item);
        }
        else {
            res.status(401).send({error: 'Not found'});
        }

    } else {
        res.send(400).send({error: 'ID required'});
    }
});

// update a specific resource
router.patch('/:id',
    requireAuth,
    async (req: Request, res: Response) => {
        //@TODO try it yourself
        let { id } = req.params;
        const caption = req.body.caption;
        const fileName = req.body.url;
        if(id){
            if (caption && fileName){
                const item = await FeedItem.findByPk(id);
                if(item) {
                    item.update({
                        caption: caption,
                        url: fileName
                    })
                    .then((updatedItem) => {res.status(201).send(updatedItem)});
                } else {
                    res.status(404).send({error: 'Item not found'});
                }

            } else {
                res.status(400).send({error: 'Missing something'});
            }
        } else {
            res.send(400).send("ID is required");
        }
});


// Get a signed url to put a new item in the bucket
router.get('/signed-url/:fileName',
    requireAuth,
    async (req: Request, res: Response) => {
    let { fileName } = req.params;
    const url = AWS.getPutSignedUrl(fileName);
    res.status(201).send({url: url});
});

// Post meta data and the filename after a file is uploaded
// NOTE the file name is they key name in the s3 bucket.
// body : {caption: string, fileName: string};
router.post('/',
    requireAuth,
    async (req: Request, res: Response) => {
    const caption = req.body.caption;
    const fileName = req.body.url;

    // check Caption is valid
    if (!caption) {
        return res.status(400).send({ message: 'Caption is required or malformed' });
    }

    // check Filename is valid
    if (!fileName) {
        return res.status(400).send({ message: 'File url is required' });
    }

    try {
        const item = await new FeedItem({
            caption: caption,
            url: fileName
         });

         const saved_item = await item.save();

         saved_item.url = AWS.getGetSignedUrl(saved_item.url);
         res.status(201).send(item);
    } catch(e) {
        console.log(e);
    }


});

export const FeedRouter: Router = router;
