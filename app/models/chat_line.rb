class ChatLine < ActiveRecord::Base
    validates_presence_of :user_id, :content

    belongs_to :user
end
