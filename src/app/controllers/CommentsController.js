const { PAGE_SIZE } = require("../../constants");
const CommentsModel = require("../../models/commnets");
const { ProductModel } = require("./../../models/Products");
class CommentController {
  //post /comments/:product_id
  getCommentsByIdProduct = async (req, res) => {
    let { sort_by, page } = req.query;
    if (!page || !Number.isInteger(Number(page))) {
      page = 1;
    }
    const skip = PAGE_SIZE * (page - 1);
    let sort = {};
    if (["createdAt_asc", "createdAt_desc"].includes(sort_by)) {
      const sortArr = sort_by.split("_");
      sort[sortArr[0]] = sortArr[1];
    } else {
      sort = { createdAt: "desc" };
    }
    const { product_id } = req.query;
    try {
      const listComment = await CommentsModel.find({ product_id })
        .lean()
        .populate({
          path: "user_id",
          select: { fullName: 1, avatar: 1 },
        })
        .sort(sort)
        .skip(skip)
        .limit(PAGE_SIZE);
      if (!listComment) {
        return res.status(400).json({ message: "failed" });
      }
      const comments = listComment.map((item) => {
        item.user = item.user_id;
        delete item.user_id;
        return item;
      });
      const total_comments = await CommentsModel.countDocuments({ product_id });
      const product = await ProductModel.findOne({ _id: { $eq: product_id } }).lean();

      if (!product) {
        return res.status(400).json({ message: "not found product" });
      }

      res.status(200).json({
        page: Number(page),
        total_page: Math.ceil(total_comments / PAGE_SIZE),
        total_comments,
        vote_count: product.vote_count,
        vote_average: product.vote_average,
        data: comments,
      });
    } catch (error) {
      console.log(error.message);
      res.status(500).json("Server error !!!");
    }
  };

  // posst :/comments
  postComment = async (req, res) => {
    const data = req.body;
    const { rating, product_id } = data;
    try {
      const newComment = new CommentsModel(data);
      await newComment.save();
      const commentData = await newComment.populate("user_id");
      commentData._doc.user = commentData._doc.user_id;
      delete commentData._doc.user_id;

      if (!commentData) {
        return res.status(400).json({ message: "Post comment failed" });
      }
      this.updateRating(rating, res, product_id);
      res.status(200).json(commentData._doc);
    } catch (error) {
      console.log(error.message);
      res.status(500).json("Server error !!!");
    }
  };

  updateComment = async (req, res) => {
    let data = req.body;
    const { rating } = data;
    let { id } = req.params;
    try {
      const commentUpdate = await CommentsModel.findOneAndUpdate({ _id: id }, data, {
        new: true,
      })
        .lean()
        .populate("user_id");
      if (!commentUpdate) {
        return res.status(400).json({ message: "update failed" });
      }
      commentUpdate.user = commentUpdate.user_id;
      delete commentUpdate.user_id;
      this.updateRating(rating, res, commentUpdate.product_id);
      res.status(200).json(commentUpdate);
    } catch (error) {
      res.status(500).json("Server error !!!");
    }
  };

  //DELETE : /comments/:id
  deteteComment = async (req, res) => {
    let { id } = req.params;
    try {
      const comment = await CommentsModel.findById(id);
      if (!comment) {
        return res.status(400).json({ message: "failed" });
      }
      const { product_id, rating } = comment;
      const commentDelete = await CommentsModel.deleteOne({ _id: id });
      if (!commentDelete) {
        return res.status(400).json({ message: "delete failed" });
      }
      this.updateRating(rating, res, product_id);
      res.status(200).json(commentDelete);
    } catch (error) {
      res.status(500).json("Server error !!!");
    }
  };

  updateRating = async (rating, res, product_id) => {
    if (rating && rating > 0) {
      const listComment = await CommentsModel.find({ product_id });
      if (!listComment) {
        return res.status(400).json({ message: "failed" });
      } else {
        let vote_average = 0;
        const vote_count = listComment.filter((vote) => vote.rating > 0).length;
        if (vote_count > 0) {
          vote_average = (
            listComment.reduce((total, vote) => {
              if (vote.rating !== "undefined" && vote.rating > 0) return total + vote.rating;
              else return total;
            }, 0) / vote_count
          ).toFixed(1);
        }
        const productUpdate = await ProductModel.findOneAndUpdate(
          { _id: product_id },
          { vote_count, vote_average }
        );
        if (!productUpdate) return res.status(400).json({ message: "rating failed" });
      }
    }
  };
}
module.exports = new CommentController();
