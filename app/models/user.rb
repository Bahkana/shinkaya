class User < ActiveRecord::Base
    # Include default devise modules. Others available are:
    # :confirmable, :lockable, :timeoutable and :omniauthable
    devise :database_authenticatable, :registerable,
            :recoverable, :rememberable, :trackable, :validatable

    validates_uniqueness_of :username, :email

    # rank
    # There is field rank, which represents current rank of the user.
    # It goes from -999.99 to 999.9, where -999.99 is lowest possible rank.
    # 0 Means namely rank between 1k and 1d, where one is not exactly either one.
    # In such case, rank is rounded upwards, hence this person would be 1d.
    #
    # Ranks are thought to visibly go from 30k to 9d. At first Lowest available
    # rank that’s chooseable is 15k in order to avoid people setting their rank too low
    # initially. Upper limit for initial rank is 4d.
    #
    # Each rank consists of 10 points, which means if your rank is 10.35, it would be 2d, and
    # if it were 9.99, it would be 1d. If your rank was -50.54, you’d be 5k. Ranks lower than 30k (-300)
    # and higher than 9d (90) will always be floored to 30k or 9d, respectively.

    # Formatted presentation of rank. Converts the decimal to format like 7k for user representation.
    #
    # TODO: I’m not sure I calculated the points correctly :P
    def formatted_rank
        case self.rank
        when self.rank >= 90
            "9d"
        when self.rank >= 0
            "#{self.rank.to_s[0]}d"
        when self.rank < 300
            "30k"
        when self.rank < 0
            "#{self.rank.to_s[1]}k"
        end
    end
end
