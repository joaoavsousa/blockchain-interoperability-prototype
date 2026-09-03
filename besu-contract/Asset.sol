// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * Represents product-specific fungible asset quantities.
 *
 * Each asset ID corresponds to one DPP-backed product.
 * Balances are maintained independently for every asset and owner.
 */
contract Asset {
    mapping(uint256 => mapping(address => uint256)) private balances;

    event Minted(
        uint256 indexed assetId,
        address indexed to,
        uint256 amount
    );

    event Burned(
        uint256 indexed assetId,
        address indexed from,
        uint256 amount
    );

    function mint(
        uint256 assetId,
        address to,
        uint256 amount
    ) external {
        require(assetId > 0, "asset ID must be positive");
        require(to != address(0), "invalid destination address");
        require(amount > 0, "amount must be positive");

        balances[assetId][to] += amount;

        emit Minted(
            assetId,
            to,
            amount
        );
    }

    function burn(
        uint256 assetId,
        address from,
        uint256 amount
    ) external {
        require(assetId > 0, "asset ID must be positive");
        require(from != address(0), "invalid source address");
        require(amount > 0, "amount must be positive");

        require(
            balances[assetId][from] >= amount,
            "insufficient asset balance"
        );

        balances[assetId][from] -= amount;

        emit Burned(
            assetId,
            from,
            amount
        );
    }

    function balanceOf(
        uint256 assetId,
        address owner
    ) external view returns (uint256) {
        require(assetId > 0, "asset ID must be positive");
        require(owner != address(0), "invalid owner address");

        return balances[assetId][owner];
    }
}
